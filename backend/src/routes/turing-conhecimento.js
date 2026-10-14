"use strict";

const express = require("express");

function criarRotasTuringConhecimento({ pool, autenticar }) {
  if (!pool || typeof autenticar !== "function") {
    throw new Error("Banco e autenticação são obrigatórios.");
  }

  const router = express.Router();

  router.use(autenticar);

  router.use((req, res, next) => {
    const emailPermitido = (
      process.env.TURING_TRAINING_ADMIN_EMAIL || ""
    ).trim().toLowerCase();

    const emailUsuario = (
      req.auth?.usuarioEmail || ""
    ).trim().toLowerCase();

    const usuarioAdmin =
      !!emailPermitido &&
      !!emailUsuario &&
      emailUsuario === emailPermitido &&
      Number.isSafeInteger(req.auth?.organizacaoId) &&
      Number.isSafeInteger(req.auth?.usuarioId);

    const apiKeyTreinamento =
      req.auth?.tipo === "api_key" &&
      Number.isSafeInteger(req.auth?.organizacaoId) &&
      Number.isSafeInteger(req.auth?.usuarioId) &&
      Array.isArray(req.auth?.scopes) &&
      req.auth.scopes.includes("turing:training");

    if (!usuarioAdmin && !apiKeyTreinamento) {
      return res.status(403).json({
        ok: false,
        erro: "Acesso administrativo ou escopo turing:training necessário."
      });
    }

    next();
  });

  router.post("/ensinar", async (req, res, next) => {
    try {
      const { area, pergunta, resposta, fonte } = req.body || {};

      if (
        typeof area !== "string" ||
        typeof pergunta !== "string" ||
        typeof resposta !== "string" ||
        (fonte !== undefined && typeof fonte !== "string")
      ) {
        return res.status(400).json({
          ok: false,
          erro: "Dados inválidos."
        });
      }

      const dados = {
        area: area.trim(),
        pergunta: pergunta.trim(),
        resposta: resposta.trim(),
        fonte: (fonte || "").trim()
      };

      if (
        !dados.area ||
        dados.area.length > 120 ||
        !dados.pergunta ||
        dados.pergunta.length > 5000 ||
        !dados.resposta ||
        dados.resposta.length > 20000 ||
        dados.fonte.length > 2000
      ) {
        return res.status(400).json({
          ok: false,
          erro: "Campos obrigatórios ou limites inválidos."
        });
      }

      const resultado = await pool.query(
        `INSERT INTO turing_conhecimento
          (organizacao_id, autor_usuario_id, area, pergunta,
           resposta, fonte, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'rascunho')
         RETURNING id, area, status, versao, criado_em`,
        [
          req.auth.organizacaoId,
          req.auth.usuarioId,
          dados.area,
          dados.pergunta,
          dados.resposta,
          dados.fonte || null
        ]
      );

      return res.status(201).json({
        ok: true,
        mensagem: "Ensinamento registrado para revisão.",
        conhecimento: resultado.rows[0]
      });
    } catch (erro) {
      next(erro);
    }
  });


  router.get("/listar", async (req, res, next) => {
    try {
      const resultado = await pool.query(
        `SELECT id, area, pergunta, resposta, fonte, status,
                versao, criado_em, aprovado_em
           FROM turing_conhecimento
          WHERE organizacao_id = $1
          ORDER BY criado_em DESC, id DESC
          LIMIT 100`,
        [req.auth.organizacaoId]
      );

      return res.json({
        ok: true,
        total: resultado.rows.length,
        conhecimentos: resultado.rows
      });
    } catch (erro) {
      next(erro);
    }
  });


  router.patch("/:id/revisar", async (req, res, next) => {
    try {
      const id = req.params.id;
      const status = req.body?.status;

      if (!/^[1-9][0-9]*$/.test(id) ||
          !["aprovado", "rejeitado"].includes(status)) {
        return res.status(400).json({
          ok: false,
          erro: "ID ou decisão inválida."
        });
      }

      const resultado = await pool.query(
        `UPDATE turing_conhecimento
            SET status = $1,
                aprovado_por = CASE
                  WHEN $1 = 'aprovado' THEN $2
                  ELSE NULL
                END,
                aprovado_em = CASE
                  WHEN $1 = 'aprovado' THEN NOW()
                  ELSE NULL
                END,
                versao = versao + 1,
                atualizado_em = NOW()
          WHERE id = $3
            AND organizacao_id = $4
            AND status = 'rascunho'
          RETURNING id, area, status, versao,
                    aprovado_por, aprovado_em`,
        [
          status,
          req.auth.usuarioId,
          id,
          req.auth.organizacaoId
        ]
      );

      if (!resultado.rowCount) {
        return res.status(409).json({
          ok: false,
          erro: "Registro inexistente, fora da organização ou já revisado."
        });
      }

      return res.json({
        ok: true,
        mensagem: "Revisão registrada.",
        conhecimento: resultado.rows[0]
      });
    } catch (erro) {
      next(erro);
    }
  });


  router.get("/aprovados", async (req, res, next) => {
    try {
      const pergunta = typeof req.query.q === "string"
        ? req.query.q.trim() : "";

      if (pergunta.length > 500) {
        return res.status(400).json({
          ok: false,
          erro: "Consulta muito longa."
        });
      }

      const resultado = await pool.query(
        `SELECT id, area, pergunta, resposta, fonte, versao
           FROM turing_conhecimento
          WHERE organizacao_id = $1
            AND status = 'aprovado'
            AND (
              $2::text = ''
              OR POSITION(LOWER($2::text) IN LOWER(pergunta)) > 0
            )
          ORDER BY aprovado_em DESC, id DESC
          LIMIT 20`,
        [req.auth.organizacaoId, pergunta]
      );

      return res.json({
        ok: true,
        total: resultado.rows.length,
        conhecimentos: resultado.rows
      });
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = criarRotasTuringConhecimento;
