"use strict";

const crypto = require("crypto");

const {
  responderPerguntaPublica
} = require("./turing-publico");

function normalizarTexto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarNumero(valor) {
  return typeof valor === "string"
    ? valor.replace(/\D+/g, "").slice(0, 20)
    : "";
}

function gerarSessaoId(numero) {
  return crypto
    .createHash("sha256")
    .update(numero || "anonimo")
    .digest("hex")
    .slice(0, 32);
}

function extrairMensagemMeta(payload) {
  try {
    const value =
      payload?.entry?.[0]?.changes?.[0]?.value;

    const mensagem = value?.messages?.[0];
    const contato = value?.contacts?.[0];

    if (!mensagem) return null;

    return {
      texto:
        mensagem?.type === "text"
          ? normalizarTexto(mensagem?.text?.body)
          : "",

      numero:
        normalizarNumero(
          mensagem?.from ||
          contato?.wa_id ||
          ""
        ),

      nome:
        normalizarTexto(
          contato?.profile?.name
        ),

      contato_id:
        normalizarTexto(
          contato?.wa_id ||
          mensagem?.from
        ),

      wa_id:
        normalizarTexto(
          contato?.wa_id ||
          mensagem?.from
        ),

      message_id:
        normalizarTexto(mensagem?.id),

      phone_number_id:
        normalizarTexto(
          value?.metadata?.phone_number_id
        ),

      tipo:
        normalizarTexto(mensagem?.type)
    };
  } catch {
    return null;
  }
}

function normalizarEntrada(payload) {
  const meta = extrairMensagemMeta(payload);

  if (meta) {
    return {
      ...meta,
      formato: "meta"
    };
  }

  return {
    texto: normalizarTexto(payload?.texto),
    numero: normalizarNumero(payload?.numero),
    nome: normalizarTexto(payload?.nome),
    contato_id: normalizarTexto(payload?.contato_id),
    wa_id: normalizarTexto(payload?.wa_id),
    message_id: normalizarTexto(payload?.message_id),
    phone_number_id: normalizarTexto(payload?.phone_number_id),
    tipo: "text",
    formato: "interno"
  };
}

async function garantirTabelaWhatsApp(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS turing_whatsapp_conversas (
      id BIGSERIAL PRIMARY KEY,
      origem VARCHAR(40) NOT NULL DEFAULT 'whatsapp',
      contato_id VARCHAR(100),
      numero_whatsapp VARCHAR(20),
      nome_contato VARCHAR(160),
      sessao_id VARCHAR(64),
      wa_id VARCHAR(100),
      message_id VARCHAR(255),
      phone_number_id VARCHAR(100),
      mensagem TEXT NOT NULL,
      resposta TEXT,
      acao VARCHAR(80) NOT NULL,
      automatizacao BOOLEAN NOT NULL DEFAULT FALSE,
      envio_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE turing_whatsapp_conversas
      ADD COLUMN IF NOT EXISTS contato_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS numero_whatsapp VARCHAR(20),
      ADD COLUMN IF NOT EXISTS nome_contato VARCHAR(160),
      ADD COLUMN IF NOT EXISTS sessao_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS wa_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS message_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone_number_id VARCHAR(100)
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      idx_turing_whatsapp_message_id
    ON turing_whatsapp_conversas(message_id)
    WHERE message_id IS NOT NULL
  `);
}

async function processarMensagemWhatsApp({ pool, mensagem }) {
  await garantirTabelaWhatsApp(pool);

  const entrada = normalizarEntrada(mensagem);
  const texto = entrada.texto;

  if (!texto) {
    return {
      ok: false,
      acao: "ignorar",
      motivo: "mensagem_sem_texto",
      formato: entrada.formato,
      tipo: entrada.tipo
    };
  }

  if (entrada.message_id) {
    const existente = await pool.query(
      `SELECT id
         FROM turing_whatsapp_conversas
        WHERE message_id = $1
        LIMIT 1`,
      [entrada.message_id]
    );

    if (existente.rowCount) {
      return {
        ok: true,
        acao: "duplicada_ignorada",
        messageId: entrada.message_id,
        envioWhatsApp: false
      };
    }
  }

  const numeroWhatsApp = entrada.numero;

  const contatoId =
    entrada.contato_id ||
    numeroWhatsApp ||
    null;

  const sessaoId = gerarSessaoId(
    numeroWhatsApp ||
    contatoId ||
    "anonimo"
  );

  const respostaTuring =
    await responderPerguntaPublica(texto);

  const respostaTexto =
    typeof respostaTuring?.resposta === "string"
      ? respostaTuring.resposta
      : null;

  const acao = "respondida_internamente";

  await pool.query(
    `INSERT INTO turing_whatsapp_conversas
      (
        origem,
        contato_id,
        numero_whatsapp,
        nome_contato,
        sessao_id,
        wa_id,
        message_id,
        phone_number_id,
        mensagem,
        resposta,
        acao,
        automatizacao,
        envio_whatsapp
      )
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      "whatsapp",
      contatoId,
      numeroWhatsApp || null,
      entrada.nome || null,
      sessaoId,
      entrada.wa_id || null,
      entrada.message_id || null,
      entrada.phone_number_id || null,
      texto,
      respostaTexto,
      acao,
      false,
      false
    ]
  );

  return {
    ok: true,
    acao,
    formato: entrada.formato,

    contato: {
      contatoId,
      numeroWhatsApp: numeroWhatsApp || null,
      nomeContato: entrada.nome || null,
      sessaoId,
      waId: entrada.wa_id || null
    },

    meta: {
      messageId: entrada.message_id || null,
      phoneNumberId: entrada.phone_number_id || null
    },

    automatizacao: false,
    envioWhatsApp: false,
    respostaTuring
  };
}

module.exports = {
  processarMensagemWhatsApp
};
