const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const NTCoinsPaymentService =
  require('../services/ntcoins-payment-service');

/*
 * =========================================================
 * SEGURANÇA
 * =========================================================
 *
 * Este endpoint NÃO usa login do usuário.
 * Webhooks são chamadas servidor -> servidor.
 *
 * O segredo deve existir apenas no ambiente do servidor:
 *
 * NTCOINS_WEBHOOK_SECRET=<segredo-forte>
 */

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));

  if (ba.length !== bb.length) {
    return false;
  }

  return crypto.timingSafeEqual(ba, bb);
}

function validarWebhook(req, res, next) {
  const secret = process.env.NTCOINS_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(503).json({
      ok: false,
      erro: 'Webhook NTCoins não configurado'
    });
  }

  const recebido =
    req.get('x-ntcoins-webhook-secret');

  if (!recebido || !safeEqual(recebido, secret)) {
    return res.status(401).json({
      ok: false,
      erro: 'Webhook não autorizado'
    });
  }

  next();
}

/*
 * =========================================================
 * POST /api/ntcoins/webhook/pagamento
 * =========================================================
 *
 * Esta é a porta interna de liquidação.
 *
 * O gateway específico será adaptado depois para enviar:
 *
 * {
 *   "pedido_id": "...",
 *   "gateway": "PAYPAL",
 *   "referencia_externa": "..."
 * }
 */

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

      if (
        !pedido_id ||
        !gateway ||
        !referencia_externa
      ) {
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
      console.error(
        '[NTCOINS WEBHOOK]',
        error.message
      );

      return res.status(400).json({
        ok: false,
        erro: error.message
      });
    }
  }
);

module.exports = router;
