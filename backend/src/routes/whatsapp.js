"use strict";

const express = require("express");
const crypto = require("crypto");
const {
  processarMensagemWhatsApp
} = require("../services/turing-whatsapp");
const {
  registrarEventoWhatsAppSecurity
} = require("../services/turing-whatsapp-security");


function validarAssinaturaMeta(req) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    return {
      ok: false,
      motivo: "app_secret_nao_configurado"
    };
  }

  const assinaturaRecebida =
    typeof req.get("x-hub-signature-256") === "string"
      ? req.get("x-hub-signature-256").trim()
      : "";

  if (!assinaturaRecebida.startsWith("sha256=")) {
    return {
      ok: false,
      motivo: "assinatura_ausente"
    };
  }

  if (!Buffer.isBuffer(req.rawBody)) {
    return {
      ok: false,
      motivo: "raw_body_indisponivel"
    };
  }

  const assinaturaEsperada =
    "sha256=" +
    crypto
      .createHmac("sha256", appSecret)
      .update(req.rawBody)
      .digest("hex");

  const recebido = Buffer.from(assinaturaRecebida);
  const esperado = Buffer.from(assinaturaEsperada);

  if (recebido.length !== esperado.length) {
    return {
      ok: false,
      motivo: "assinatura_invalida"
    };
  }

  const valido = crypto.timingSafeEqual(recebido, esperado);

  return {
    ok: valido,
    motivo: valido ? null : "assinatura_invalida"
  };
}

function criarRotasWhatsApp({ pool }) {
  const router = express.Router();

  router.get("/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");

      res.json({
        ok: true,
        modulo: "turing-whatsapp",
        security: "turing-security",
        automacao: false
      });
    } catch {
      res.status(503).json({
        ok: false,
        modulo: "turing-whatsapp"
      });
    }
  });

  router.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const tokenEsperado = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!tokenEsperado) {
      return res.status(503).json({
        ok: false,
        erro: "WHATSAPP_VERIFY_TOKEN não configurado"
      });
    }

    if (
      mode === "subscribe" &&
      token === tokenEsperado &&
      challenge
    ) {
      return res.status(200).send(challenge);
    }

    return res.status(403).json({
      ok: false,
      erro: "Verificação recusada"
    });
  });

  router.post("/webhook", async (req, res, next) => {
    try {
      const assinatura = validarAssinaturaMeta(req);

      if (!assinatura.ok) {
        await registrarEventoWhatsAppSecurity(
          pool,
          "whatsapp_signature_rejected",
          "ALERT",
          {
            motivo: assinatura.motivo
          }
        );

        return res.status(403).json({
          ok: false,
          erro: "Webhook não autorizado"
        });
      }
      const resultado = await processarMensagemWhatsApp({
        pool,
        mensagem: req.body
      });

      await registrarEventoWhatsAppSecurity(
        pool,
        "whatsapp_webhook_received",
        resultado.ok ? "PASS" : "WARN",
        {
          acao: resultado.acao,
          motivo: resultado.motivo || null
        }
      );

      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = criarRotasWhatsApp;
