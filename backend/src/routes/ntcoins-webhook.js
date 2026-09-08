const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const pool = require('../db');
const PayPal = require('../services/paypal-service');
const NTCoinsPaymentService =
  require('../services/ntcoins-payment-service');
const { criarMiddlewaresAuth } =
  require('../middleware/auth');

const { autenticar } = criarMiddlewaresAuth(pool);

/*
 * =========================================================
 * CHECKOUT PÚBLICO NTCOINS
 * =========================================================
 *
 * O pagamento pode começar sem login. A identidade do usuário
 * só é exigida DEPOIS que o PayPal confirma a compra, no momento
 * de resgatar os créditos para a carteira correta.
 *
 * O preço nunca vem do navegador. Sempre vem do PostgreSQL.
 */

let checkoutPublicoPronto = null;

async function garantirCheckoutPublico() {
  if (!checkoutPublicoPronto) {
    checkoutPublicoPronto = pool.query(`
      CREATE TABLE IF NOT EXISTS ntcoin_public_orders (
        id BIGSERIAL PRIMARY KEY,
        pedido_id VARCHAR(80) NOT NULL UNIQUE,
        pacote_codigo VARCHAR(80) NOT NULL,
        ntcoins NUMERIC(18,2) NOT NULL CHECK (ntcoins > 0),
        bonus_ntcoins NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (bonus_ntcoins >= 0),
        preco_brl NUMERIC(12,2) NOT NULL CHECK (preco_brl >= 0),
        paypal_order_id VARCHAR(120) UNIQUE,
        claim_token_hash CHAR(64) NOT NULL,
        capture_id VARCHAR(120) UNIQUE,
        payer_email VARCHAR(254),
        status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
          CHECK (status IN ('PENDENTE','PAGO','RESGATADO','CANCELADO','EXPIRADO')),
        organizacao_id BIGINT,
        usuario_id BIGINT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        pago_em TIMESTAMPTZ,
        resgatado_em TIMESTAMPTZ,
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ntcoin_public_orders_status
        ON ntcoin_public_orders (status);
      CREATE INDEX IF NOT EXISTS idx_ntcoin_public_orders_user
        ON ntcoin_public_orders (usuario_id);
    `).catch((error) => {
      checkoutPublicoPronto = null;
      throw error;
    });
  }

  await checkoutPublicoPronto;
}

function hashClaim(token) {
  return crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));

  if (ba.length !== bb.length) {
    return false;
  }

  return crypto.timingSafeEqual(ba, bb);
}

function claimValido(token, hashEsperado) {
  return safeEqual(hashClaim(token), hashEsperado);
}

function novoPedidoId() {
  return (
    'NTCP-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    crypto.randomBytes(5).toString('hex').toUpperCase()
  );
}

function baseApi(req) {
  return `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
}

async function criarCheckoutPublico(req, pacoteCodigo) {
  await garantirCheckoutPublico();

  const pacoteResult = await pool.query(
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
    const error = new Error('Pacote NTCoins não encontrado');
    error.status = 404;
    throw error;
  }

  const pacote = pacoteResult.rows[0];
  const pedidoId = novoPedidoId();
  const claimToken = crypto.randomBytes(32).toString('base64url');

  await pool.query(
    `
      INSERT INTO ntcoin_public_orders (
        pedido_id,
        pacote_codigo,
        ntcoins,
        bonus_ntcoins,
        preco_brl,
        claim_token_hash,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,'PENDENTE')
    `,
    [
      pedidoId,
      pacote.codigo,
      pacote.ntcoins,
      pacote.bonus_ntcoins,
      pacote.preco_brl,
      hashClaim(claimToken)
    ]
  );

  const api = baseApi(req);
  const returnUrl =
    `${api}/api/ntcoins/webhook/checkout/retorno` +
    `?pedido=${encodeURIComponent(pedidoId)}` +
    `&claim=${encodeURIComponent(claimToken)}`;

  const cancelUrl =
    `${api}/app/turing/?paypal_cancel=1`;

  try {
    const paypal = await PayPal.criarOrdem({
      pedidoId,
      valor: pacote.preco_brl,
      returnUrl,
      cancelUrl
    });

    if (!paypal.approval_url) {
      throw new Error('PayPal não retornou URL de aprovação');
    }

    await pool.query(
      `
        UPDATE ntcoin_public_orders
        SET paypal_order_id = $1,
            atualizado_em = NOW()
        WHERE pedido_id = $2
      `,
      [paypal.id, pedidoId]
    );

    return {
      pedidoId,
      approvalUrl: paypal.approval_url
    };

  } catch (error) {
    await pool.query(
      `
        UPDATE ntcoin_public_orders
        SET status = 'CANCELADO',
            atualizado_em = NOW()
        WHERE pedido_id = $1
      `,
      [pedidoId]
    );

    throw error;
  }
}

async function capturarCheckoutPublico({
  pedidoId,
  claimToken,
  paypalOrderId
}) {
  await garantirCheckoutPublico();

  const pedidoResult = await pool.query(
    `
      SELECT *
      FROM ntcoin_public_orders
      WHERE pedido_id = $1
      LIMIT 1
    `,
    [pedidoId]
  );

  if (!pedidoResult.rows.length) {
    throw new Error('Pedido público não encontrado');
  }

  const pedido = pedidoResult.rows[0];

  if (!claimValido(claimToken, pedido.claim_token_hash)) {
    const error = new Error('Token de resgate inválido');
    error.status = 401;
    throw error;
  }

  if (pedido.paypal_order_id !== paypalOrderId) {
    throw new Error('Ordem PayPal não corresponde ao pedido');
  }

  if (['PAGO', 'RESGATADO'].includes(pedido.status)) {
    return pedido;
  }

  if (pedido.status !== 'PENDENTE') {
    throw new Error(`Pedido não pode ser capturado no status ${pedido.status}`);
  }

  const ordem = await PayPal.capturarOrdem(paypalOrderId);

  if (ordem.status !== 'COMPLETED') {
    throw new Error(`Pagamento não concluído: ${ordem.status}`);
  }

  const unidade = (ordem.purchase_units || []).find((item) =>
    item.reference_id === pedidoId ||
    item.custom_id === pedidoId
  ) || (ordem.purchase_units || [])[0];

  if (!unidade) {
    throw new Error('Unidade de pagamento PayPal não encontrada');
  }

  const capture = (unidade.payments?.captures || []).find(
    (item) => item.status === 'COMPLETED'
  );

  if (!capture) {
    throw new Error('Captura PayPal não encontrada');
  }

  const moeda = capture.amount?.currency_code;
  const recebido = Number(capture.amount?.value);
  const esperado = Number(pedido.preco_brl);

  if (moeda !== 'BRL') {
    throw new Error('Moeda PayPal inválida');
  }

  if (!Number.isFinite(recebido) || Math.abs(recebido - esperado) > 0.001) {
    throw new Error('Valor recebido não corresponde ao pedido');
  }

  const atualizado = await pool.query(
    `
      UPDATE ntcoin_public_orders
      SET status = 'PAGO',
          capture_id = $1,
          payer_email = $2,
          pago_em = COALESCE(pago_em, NOW()),
          atualizado_em = NOW()
      WHERE pedido_id = $3
      RETURNING *
    `,
    [
      capture.id,
      ordem.payer?.email_address || null,
      pedidoId
    ]
  );

  return atualizado.rows[0];
}

async function prepararResgatePublico({
  pedidoId,
  claimToken,
  organizacaoId,
  usuarioId
}) {
  await garantirCheckoutPublico();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const publicoResult = await client.query(
      `
        SELECT *
        FROM ntcoin_public_orders
        WHERE pedido_id = $1
        FOR UPDATE
      `,
      [pedidoId]
    );

    if (!publicoResult.rows.length) {
      throw new Error('Pedido público não encontrado');
    }

    const publico = publicoResult.rows[0];

    if (!claimValido(claimToken, publico.claim_token_hash)) {
      throw new Error('Token de resgate inválido');
    }

    if (!['PAGO', 'RESGATADO'].includes(publico.status)) {
      throw new Error('Pagamento ainda não está disponível para resgate');
    }

    if (
      publico.status === 'RESGATADO' &&
      (
        Number(publico.organizacao_id) !== Number(organizacaoId) ||
        Number(publico.usuario_id) !== Number(usuarioId)
      )
    ) {
      throw new Error('Pedido já resgatado por outra conta');
    }

    if (!publico.capture_id) {
      throw new Error('Captura PayPal ausente no pedido');
    }

    const existente = await client.query(
      `
        SELECT *
        FROM ntcoin_orders
        WHERE pedido_id = $1
        LIMIT 1
      `,
      [pedidoId]
    );

    if (existente.rows.length) {
      const ordem = existente.rows[0];

      if (
        Number(ordem.organizacao_id) !== Number(organizacaoId) ||
        Number(ordem.usuario_id) !== Number(usuarioId)
      ) {
        throw new Error('Pedido já vinculado a outra conta');
      }
    } else {
      await client.query(
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
            referencia_externa,
            idempotency_key
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            'PAYPAL','PENDENTE',$8,$9
          )
        `,
        [
          pedidoId,
          organizacaoId,
          usuarioId,
          publico.pacote_codigo,
          publico.ntcoins,
          publico.bonus_ntcoins,
          publico.preco_brl,
          publico.capture_id,
          `PAYPAL-PUBLIC:${pedidoId}`
        ]
      );
    }

    await client.query('COMMIT');

    return publico;

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

router.get('/checkout/iniciar', async (req, res) => {
  const pacoteCodigo = String(req.query?.pacote || '').trim();

  if (!pacoteCodigo) {
    return res.redirect(303, '/app/turing/?paypal_error=1');
  }

  try {
    const checkout = await criarCheckoutPublico(req, pacoteCodigo);
    return res.redirect(303, checkout.approvalUrl);
  } catch (error) {
    console.error('[NTCOINS PAYPAL PUBLIC CREATE]', error.message);
    return res.redirect(303, '/app/turing/?paypal_error=1');
  }
});

router.get('/checkout/retorno', async (req, res) => {
  const pedidoId = String(req.query?.pedido || '').trim();
  const claimToken = String(req.query?.claim || '').trim();
  const paypalOrderId = String(req.query?.token || '').trim();

  if (!pedidoId || !claimToken || !paypalOrderId) {
    return res.redirect(303, '/app/turing/?paypal_error=retorno');
  }

  try {
    await capturarCheckoutPublico({
      pedidoId,
      claimToken,
      paypalOrderId
    });

    return res.redirect(
      303,
      `/app/turing/?resgatar=${encodeURIComponent(pedidoId)}` +
      `&claim=${encodeURIComponent(claimToken)}`
    );
  } catch (error) {
    console.error('[NTCOINS PAYPAL PUBLIC CAPTURE]', error.message);
    return res.redirect(303, '/app/turing/?paypal_error=capture');
  }
});

router.post(
  '/checkout/resgatar',
  autenticar,
  async (req, res) => {
    try {
      const pedidoId = String(req.body?.pedido_id || '').trim();
      const claimToken = String(req.body?.claim_token || '').trim();

      if (!pedidoId || !claimToken) {
        return res.status(400).json({
          ok: false,
          erro: 'pedido_id e claim_token obrigatórios'
        });
      }

      const publico = await prepararResgatePublico({
        pedidoId,
        claimToken,
        organizacaoId: req.auth.organizacaoId,
        usuarioId: req.auth.usuarioId
      });

      const resultado = await NTCoinsPaymentService.confirmarPagamento({
        pedidoId,
        gateway: 'PAYPAL',
        referenciaExterna: publico.capture_id
      });

      await pool.query(
        `
          UPDATE ntcoin_public_orders
          SET status = 'RESGATADO',
              organizacao_id = $1,
              usuario_id = $2,
              resgatado_em = COALESCE(resgatado_em, NOW()),
              atualizado_em = NOW()
          WHERE pedido_id = $3
        `,
        [
          req.auth.organizacaoId,
          req.auth.usuarioId,
          pedidoId
        ]
      );

      return res.json({
        ok: true,
        mensagem: 'Pagamento confirmado e NTCoins creditados',
        ...resultado
      });

    } catch (error) {
      console.error('[NTCOINS PAYPAL PUBLIC CLAIM]', error.message);
      return res.status(error.status || 400).json({
        ok: false,
        erro: error.message
      });
    }
  }
);

/*
 * =========================================================
 * SEGURANÇA DO WEBHOOK INTERNO
 * =========================================================
 *
 * Este endpoint NÃO usa login do usuário.
 * Webhooks são chamadas servidor -> servidor.
 */

function validarWebhook(req, res, next) {
  const secret = process.env.NTCOINS_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(503).json({
      ok: false,
      erro: 'Webhook NTCoins não configurado'
    });
  }

  const recebido = req.get('x-ntcoins-webhook-secret');

  if (!recebido || !safeEqual(recebido, secret)) {
    return res.status(401).json({
      ok: false,
      erro: 'Webhook não autorizado'
    });
  }

  next();
}

router.post(
  '/pagamento',
  validarWebhook,
  async (req, res) => {
    try {
      const {
        pedido_id,
        gateway,
        referencia_externa
      } = req.body || {};

      if (!pedido_id || !gateway || !referencia_externa) {
        return res.status(400).json({
          ok: false,
          erro:
            'pedido_id, gateway e referencia_externa são obrigatórios'
        });
      }

      const resultado =
        await NTCoinsPaymentService.confirmarPagamento({
          pedidoId: pedido_id,
          gateway,
          referenciaExterna: referencia_externa
        });

      return res.json(resultado);

    } catch (error) {
      console.error('[NTCOINS WEBHOOK]', error.message);

      return res.status(400).json({
        ok: false,
        erro: error.message
      });
    }
  }
);

module.exports = router;
