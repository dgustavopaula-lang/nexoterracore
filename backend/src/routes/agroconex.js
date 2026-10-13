"use strict";

const express = require("express");

function criarRotasAgroConex({ pool, autenticar }) {
  const router = express.Router();

  // Todas as rotas exigem autenticacao.
  router.use(autenticar);

  router.get("/status", async (req, res) => {
    try {
      await pool.query("SELECT 1");

      return res.json({
        ok: true,
        modulo: "AgroConex",
        banco: "conectado",
        autenticado: true
      });
    } catch (erro) {
      console.error("AgroConex:", erro.message);

      return res.status(503).json({
        ok: false,
        erro: "Servico temporariamente indisponivel"
      });
    }
  });

  return router;
}

module.exports = { criarRotasAgroConex };
