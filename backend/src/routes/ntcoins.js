const express = require('express');
const crypto = require('crypto');
const { ntcoinsAuthContext } = require('../middleware/ntcoins-auth-context');
const router = express.Router();

router.use(ntcoinsAuthContext);

const pool = require('../db');
const NTCoinsService = require('../services/ntcoins-service');
const NTCoinsConsumoService = require('../services/ntcoins-consumo-service');

/* =========================================================
   CONTEXTO AUTENTICADO
   ========================================================= */
function getContext(req) {
  if (!req.ntcoinsAuth) {
    const err = new Error('Contexto NTCoins não autenticado');
    err.status = 401;
    throw err;
  }

  return {
    organizacaoId: req.ntcoinsAuth.organizacaoId,
    usuarioId: req.ntcoinsAuth.usuarioId,
    perfil: req.ntcoinsAuth.perfil
  };
}

function requireAdmin(req, res, next) {
  const perfil = String(
    req.user?.perfil ||
    req.user?.role ||
    req.auth?.perfil ||
    req.auth?.role ||
    ''
  ).toLowerCase();

  const permitido = [
    'admin',
    'administrador',
    'owner',
    'proprietario',
    'proprietário',
    'superadmin'
  ].includes(perfil);

  if (!permitido) {
    return res.status(403).json({
      ok: false,
      erro: 'Operação restrita à administração'
    });
  }

  next();
}

/* =========================================================
   GET /api/ntcoins/saldo
   ========================================================= */

/* =========================================================
   GET /api/ntcoins/me
   Identidade autenticada usada pela carteira
   ========================================================= */
router.get('/me', async (req, res) => {
  try {
    const {
      organizacaoId,
      usuarioId,
      perfil
    } = getContext(req);

    const wallet = await NTCoinsService.getOrCreateWallet(
      organizacaoId,
      usuarioId
    );

    res.json({
      ok: true,
      usuario_id: usuarioId,
      organizacao_id: organizacaoId,
      perfil,
      wallet_id: wallet.id,
      saldo: Number(wallet.saldo),
      admin_isento: wallet.admin_isento
    });

  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

router.get('/saldo', async (req, res) => {
  try {
    const { organizacaoId, usuarioId } = getContext(req);

    const saldo = await NTCoinsService.getSaldo(
      organizacaoId,
      usuarioId
    );

    res.json({
      ok: true,
      moeda: 'NTCoins',
      ...saldo
    });
  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   GET /api/ntcoins/extrato
   ========================================================= */
router.get('/extrato', async (req, res) => {
  try {
    const { organizacaoId, usuarioId } = getContext(req);

    const wallet = await NTCoinsService.getOrCreateWallet(
      organizacaoId,
      usuarioId
    );

    const { rows } = await pool.query(
      `
      SELECT
        id,
        tipo,
        quantidade,
        saldo_anterior,
        saldo_posterior,
        descricao,
        referencia,
        criado_em
      FROM ntcoin_transactions
      WHERE wallet_id = $1
        AND organizacao_id = $2
        AND usuario_id = $3
      ORDER BY criado_em DESC
      LIMIT 100
      `,
      [wallet.id, organizacaoId, usuarioId]
    );

    res.json({
      ok: true,
      moeda: 'NTCoins',
      saldo: Number(wallet.saldo),
      admin_isento: wallet.admin_isento,
      transacoes: rows
    });
  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   GET /api/ntcoins/catalogo
   ========================================================= */
router.get('/catalogo', async (req, res) => {
  try {
    getContext(req);

    const { rows } = await pool.query(
      `
      SELECT codigo, nome, descricao, custo, categoria
      FROM ntcoin_catalog
      WHERE ativo = TRUE
      ORDER BY categoria, custo, nome
      `
    );

    res.json({
      ok: true,
      moeda: 'NTCoins',
      servicos: rows
    });
  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   POST /api/ntcoins/consumir
   ========================================================= */
router.post('/consumir', async (req, res) => {
  try {
    const { organizacaoId, usuarioId } = getContext(req);

    const { codigo, referencia } = req.body;

    if (!codigo) {
      return res.status(400).json({
        ok: false,
        erro: 'Código do serviço é obrigatório'
      });
    }

    const resultado = await NTCoinsConsumoService.consumir({
      organizacaoId,
      usuarioId,
      codigo,
      referencia
    });

    res.json(resultado);
  } catch (error) {
    res.status(
      error.message === 'Saldo NTCoins insuficiente'
        ? 402
        : (error.status || 400)
    ).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   POST /api/ntcoins/creditar
   SOMENTE ADMINISTRAÇÃO
   ========================================================= */
router.post('/creditar', requireAdmin, async (req, res) => {
  try {
    const { organizacaoId, usuarioId } = getContext(req);

    const alvoUsuarioId =
      Number(req.body.usuario_id) || usuarioId;

    const transacao = await NTCoinsService.creditar({
      organizacaoId,
      usuarioId: alvoUsuarioId,
      quantidade: req.body.quantidade,
      tipo: req.body.tipo || 'CREDITO',
      descricao: req.body.descricao,
      referencia: req.body.referencia
    });

    res.status(201).json({
      ok: true,
      moeda: 'NTCoins',
      transacao
    });
  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   POST /api/ntcoins/debitar
   AJUSTE MANUAL — SOMENTE ADMIN
   ========================================================= */
router.post('/debitar', requireAdmin, async (req, res) => {
  try {
    const { organizacaoId, usuarioId } = getContext(req);

    const alvoUsuarioId =
      Number(req.body.usuario_id) || usuarioId;

    const transacao = await NTCoinsService.debitar({
      organizacaoId,
      usuarioId: alvoUsuarioId,
      quantidade: req.body.quantidade,
      descricao: req.body.descricao || 'Ajuste administrativo',
      referencia: req.body.referencia
    });

    res.json({
      ok: true,
      moeda: 'NTCoins',
      transacao
    });
  } catch (error) {
    res.status(
      error.message === 'Saldo NTCoins insuficiente'
        ? 402
        : (error.status || 400)
    ).json({
      ok: false,
      erro: error.message
    });
  }
});


/* =========================================================
   GET /api/ntcoins/pacotes
   ========================================================= */
router.get('/pacotes', async (req, res) => {
  try {
    getContext(req);

    const { rows } = await pool.query(
      `
      SELECT
        codigo,
        nome,
        ntcoins,
        bonus_ntcoins,
        preco_brl,
        descricao
      FROM ntcoin_packages
      WHERE ativo = TRUE
      ORDER BY preco_brl ASC
      `
    );

    res.json({
      ok: true,
      moeda_pagamento: 'BRL',
      unidade: 'NTCoins',
      pacotes: rows
    });

  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   POST /api/ntcoins/comprar
   Cria pedido. NÃO credita NTCoins.
   ========================================================= */
router.post('/comprar', async (req, res) => {
  try {
    const {
      organizacaoId,
      usuarioId
    } = getContext(req);

    const pacoteCodigo = String(
      req.body.pacote_codigo || ''
    ).trim();

    const gateway = String(
      req.body.gateway || ''
    ).trim().toUpperCase();

    if (!pacoteCodigo) {
      return res.status(400).json({
        ok: false,
        erro: 'Pacote é obrigatório'
      });
    }

    const gatewaysPermitidos = [
      'PIX',
      'PAYPAL',
      'PICPAY'
    ];

    if (
      gateway &&
      !gatewaysPermitidos.includes(gateway)
    ) {
      return res.status(400).json({
        ok: false,
        erro: 'Gateway de pagamento inválido'
      });
    }

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
      return res.status(404).json({
        ok: false,
        erro: 'Pacote NTCoins não encontrado'
      });
    }

    const pacote = pacoteResult.rows[0];

    const idempotencyKey =
      req.get('Idempotency-Key') ||
      req.body.idempotency_key ||
      crypto.randomUUID();

    const existente = await pool.query(
      `
      SELECT *
      FROM ntcoin_orders
      WHERE organizacao_id = $1
        AND usuario_id = $2
        AND idempotency_key = $3
      LIMIT 1
      `,
      [
        organizacaoId,
        usuarioId,
        idempotencyKey
      ]
    );

    if (existente.rows.length) {
      return res.json({
        ok: true,
        reutilizado: true,
        pedido: existente.rows[0]
      });
    }

    const pedidoId =
      'NTC-' +
      Date.now().toString(36).toUpperCase() +
      '-' +
      crypto.randomBytes(4)
        .toString('hex')
        .toUpperCase();

    const pedidoResult = await pool.query(
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
        $1,$2,$3,$4,$5,$6,$7,$8,'PENDENTE',$9
      )
      RETURNING *
      `,
      [
        pedidoId,
        organizacaoId,
        usuarioId,
        pacote.codigo,
        pacote.ntcoins,
        pacote.bonus_ntcoins,
        pacote.preco_brl,
        gateway || null,
        idempotencyKey
      ]
    );

    res.status(201).json({
      ok: true,
      mensagem:
        'Pedido criado. NTCoins serão liberados somente após confirmação do pagamento.',
      pedido: pedidoResult.rows[0]
    });

  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});

/* =========================================================
   GET /api/ntcoins/compras
   Histórico do próprio usuário
   ========================================================= */
router.get('/compras', async (req, res) => {
  try {
    const {
      organizacaoId,
      usuarioId
    } = getContext(req);

    const { rows } = await pool.query(
      `
      SELECT
        pedido_id,
        pacote_codigo,
        ntcoins,
        bonus_ntcoins,
        preco_brl,
        gateway,
        status,
        criado_em,
        pago_em
      FROM ntcoin_orders
      WHERE organizacao_id = $1
        AND usuario_id = $2
      ORDER BY criado_em DESC
      LIMIT 100
      `,
      [
        organizacaoId,
        usuarioId
      ]
    );

    res.json({
      ok: true,
      compras: rows
    });

  } catch (error) {
    res.status(error.status || 400).json({
      ok: false,
      erro: error.message
    });
  }
});


module.exports = router;
