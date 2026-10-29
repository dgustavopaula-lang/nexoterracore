"use strict";

const express = require("express");

function criarRotasAgroConexSync({ pool, autenticar }) {
  const router = express.Router();

  router.use(autenticar);

  function inteiroPositivo(valor) {
    const numero = Number(valor);

    return Number.isSafeInteger(numero) && numero > 0
      ? numero
      : null;
  }

  function contexto(req) {
    const candidatos = [
      req.usuario,
      req.user,
      req.auth,
      req.sessao
    ];

    for (const candidato of candidatos) {
      if (!candidato || typeof candidato !== "object") {
        continue;
      }

      const usuarioId = inteiroPositivo(
        candidato.usuario_id ??
        candidato.user_id ??
        candidato.id
      );

      const organizacaoId = inteiroPositivo(
        candidato.organizacao_id ??
        candidato.empresa_id
      );

      if (usuarioId && organizacaoId) {
        return { usuarioId, organizacaoId };
      }
    }

    return null;
  }

  function exigirContexto(req, res, next) {
    const dados = contexto(req);

    if (!dados) {
      return res.status(403).json({
        ok: false,
        erro: "Contexto de usuario e empresa nao validado"
      });
    }

    req.agroconex = dados;
    next();
  }

  router.use(exigirContexto);

  router.get("/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");

      return res.json({
        ok: true,
        modulo: "AgroConex",
        autenticado: true,
        banco: "conectado"
      });

    } catch (erro) {
      return res.status(503).json({
        ok: false,
        erro: "Banco indisponivel"
      });
    }
  });

  router.post("/registros", async (req, res) => {
    const { organizacaoId, usuarioId } = req.agroconex;

    const descricao = req.body?.descricao;

    if (
      typeof descricao !== "string" ||
      !descricao.trim() ||
      descricao.length > 2000
    ) {
      return res.status(400).json({
        ok: false,
        erro: "Descricao obrigatoria, ate 2000 caracteres"
      });
    }

    try {
      const resultado = await pool.query(
        `
        INSERT INTO agroconex_registros
          (
            organizacao_id,
            usuario_id,
            tipo,
            descricao,
            status
          )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, criado_em
        `,
        [
          organizacaoId,
          usuarioId,
          "atividade",
          descricao.trim(),
          "registrado"
        ]
      );

      return res.status(201).json({
        ok: true,
        registro: resultado.rows[0]
      });

    } catch (erro) {
      console.error(
        "AgroConex | gravacao:",
        erro.code || erro.message
      );

      return res.status(503).json({
        ok: false,
        erro: "Nao foi possivel registrar a atividade"
      });
    }
  });

  router.get("/registros", async (req, res) => {
    const { organizacaoId, usuarioId } = req.agroconex;

    try {
      const resultado = await pool.query(
        `
        SELECT
          id,
          tipo,
          descricao,
          status,
          criado_em
        FROM agroconex_registros
        WHERE organizacao_id = $1
          AND usuario_id = $2
        ORDER BY criado_em DESC
        LIMIT 100
        `,
        [organizacaoId, usuarioId]
      );

      return res.json({
        ok: true,
        total: resultado.rowCount,
        registros: resultado.rows
      });

    } catch (erro) {
      console.error(
        "AgroConex | consulta:",
        erro.code || erro.message
      );

      return res.status(503).json({
        ok: false,
        erro: "Nao foi possivel consultar os registros"
      });
    }
  });

  return router;
}

module.exports = { criarRotasAgroConexSync };
