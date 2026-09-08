const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const pool = require('../db');

const {
  ntcoinsAuthContext
} = require('../middleware/ntcoins-auth-context');

const PayPal =
  require('../services/paypal-service');

const NTCoinsPaymentService =
  require('../services/ntcoins-payment-service');

router.use(ntcoinsAuthContext);

/* =========================================================
   CRIAR COMPRA
   ========================================================= */

router.post('/criar', async (req, res) => {
  try {
    const {
      organizacaoId,
      usuarioId
    } = req.ntcoinsAuth;

    const pacoteCodigo =
      String(
        req.body?.pacote_codigo || ''
      ).trim();

    if (!pacoteCodigo) {
      return res.status(400).json({
        ok: false,
        erro: 'Pacote obrigatório'
      });
    }

    const pacoteResult =
      await pool.query(
        `
        SELECT *
        FROM ntcoin_packages
        WHERE codigo = $1
          AND ativo = TRUE
        LIMIT 1
        `,
        [pacoteCodigo]
      );

    if (!pacoteResult.rows.length) {
      return res.status(404).json({
        ok: false,
        erro: 'Pacote NTCoins não encontrado'
      });
    }

    const pacote =
      pacoteResult.rows[0];

    /*
     * O navegador nunca informa o preço.
     * O valor oficial vem do PostgreSQL.
     */
    const pedidoId =
      'NTC-' +
      Date.now()
        .toString(36)
        .toUpperCase() +
      '-' +
      crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase();

    await pool.query(
      `
      INSERT INTO ntcoin_orders (
        pedido_id,
        organizacao_id,
        usuario_id,
        pacote_codigo,
        ntcoins,
        bonus_ntcoins,
        preco_brl,
        gateway,
        status,
        idempotency_key
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        'PAYPAL',
        'PENDENTE',
        $8
      )
      `,
      [
        pedidoId,
        organizacaoId,
        usuarioId,
        pacote.codigo,
        pacote.ntcoins,
        pacote.bonus_ntcoins,
        pacote.preco_brl,
        `PAYPAL:${pedidoId}`
      ]
    );

    const turingPublicUrl = String(
      process.env.TURING_PUBLIC_URL ||
      'https://turing.gustavopaulasantos.com.br/'
    ).replace(/\/+$/, '');

    const returnUrl =
      `${turingPublicUrl}/?ntcoins=paypal-return` +
      `&pedido=${encodeURIComponent(pedidoId)}`;

    const cancelUrl =
      `${turingPublicUrl}/?ntcoins=paypal-cancel`;

    let paypal;

    try {
      paypal =
        await PayPal.criarOrdem({
          pedidoId,
          valor: pacote.preco_brl,
          returnUrl,
          cancelUrl
        });

    } catch (error) {

      await pool.query(
        `
        UPDATE ntcoin_orders
        SET status = 'CANCELADO',
            atualizado_em = NOW()
        WHERE pedido_id = $1
        `,
        [pedidoId]
      );

      throw error;
    }

    if (!paypal.approval_url) {
      throw new Error(
        'PayPal não retornou URL de aprovação'
      );
    }

    await pool.query(
      `
      UPDATE ntcoin_orders
      SET gateway_order_id = $1,
          atualizado_em = NOW()
      WHERE pedido_id = $2
      `,
      [
        paypal.id,
        pedidoId
      ]
    );

    res.status(201).json({
      ok: true,

      pedido_id:
        pedidoId,

      paypal_order_id:
        paypal.id,

      approval_url:
        paypal.approval_url,

      pacote: {
        codigo:
          pacote.codigo,

        ntcoins:
          Number(pacote.ntcoins),

        bonus:
          Number(
            pacote.bonus_ntcoins || 0
          ),

        preco_brl:
          Number(pacote.preco_brl)
      }
    });

  } catch (error) {

    console.error(
      '[NTCOINS PAYPAL CREATE]',
      error.message
    );

    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   CAPTURAR PAGAMENTO
   ========================================================= */

router.post('/capturar', async (req, res) => {
  try {
    const {
      organizacaoId,
      usuarioId
    } = req.ntcoinsAuth;

    const pedidoId =
      String(
        req.body?.pedido_id || ''
      ).trim();

    const paypalOrderId =
      String(
        req.body?.paypal_order_id || ''
      ).trim();

    if (
      !pedidoId ||
      !paypalOrderId
    ) {
      return res.status(400).json({
        ok: false,
        erro:
          'pedido_id e paypal_order_id obrigatórios'
      });
    }

    const pedidoResult =
      await pool.query(
        `
        SELECT *
        FROM ntcoin_orders
        WHERE pedido_id = $1
          AND organizacao_id = $2
          AND usuario_id = $3
          AND gateway = 'PAYPAL'
        LIMIT 1
        `,
        [
          pedidoId,
          organizacaoId,
          usuarioId
        ]
      );

    if (!pedidoResult.rows.length) {
      return res.status(404).json({
        ok: false,
        erro: 'Pedido não encontrado'
      });
    }

    const pedido =
      pedidoResult.rows[0];

    if (
      pedido.gateway_order_id !==
      paypalOrderId
    ) {
      return res.status(400).json({
        ok: false,
        erro:
          'Ordem PayPal não corresponde ao pedido'
      });
    }

    const ordem =
      await PayPal.capturarOrdem(
        paypalOrderId
      );

    if (ordem.status !== 'COMPLETED') {
      return res.status(409).json({
        ok: false,
        erro:
          `Pagamento não concluído: ${ordem.status}`
      });
    }

    const captures = [];

    for (
      const unidade of
      ordem.purchase_units || []
    ) {
      for (
        const capture of
        unidade.payments?.captures || []
      ) {
        captures.push(capture);
      }
    }

    const capture =
      captures.find(
        item =>
          item.status === 'COMPLETED'
      );

    if (!capture) {
      return res.status(409).json({
        ok: false,
        erro:
          'Captura PayPal não encontrada'
      });
    }

    const moeda =
      capture.amount?.currency_code;

    const recebido =
      Number(capture.amount?.value);

    const esperado =
      Number(pedido.preco_brl);

    if (moeda !== 'BRL') {
      throw new Error(
        'Moeda PayPal inválida'
      );
    }

    if (
      Math.abs(
        recebido - esperado
      ) > 0.001
    ) {
      throw new Error(
        'Valor recebido não corresponde ao pedido'
      );
    }

    const resultado =
      await NTCoinsPaymentService
        .confirmarPagamento({
          pedidoId,
          gateway: 'PAYPAL',
          referenciaExterna:
            capture.id
        });

    res.json({
      ok: true,

      pagamento:
        'PAYPAL',

      paypal_capture_id:
        capture.id,

      ...resultado
    });

  } catch (error) {

    console.error(
      '[NTCOINS PAYPAL CAPTURE]',
      error.message
    );

    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

module.exports = router;
