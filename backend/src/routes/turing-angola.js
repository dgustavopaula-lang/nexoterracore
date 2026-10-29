"use strict";

const express = require("express");
const {
  resumirRadarAngola,
  listarSinaisAngola
} = require("../services/turing-angola-radar");

function criarRotasTuringAngola({ pool, autenticar }) {
  const router = express.Router();

  router.get("/resumo", autenticar, async (req, res) => {
    try {
      const resumo = await resumirRadarAngola(pool, req.auth);
      return res.json({ ok: true, organizacao_id: req.auth.organizacaoId, resumo });
    } catch (erro) {
      console.error("[TuringAngola] resumo:", erro.message);
      return res.status(500).json({ ok: false, erro: "Falha ao consultar resumo Angola" });
    }
  });

  router.get("/sinais", autenticar, async (req, res) => {
    const filtros = {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      setor: typeof req.query.setor === "string" ? req.query.setor : undefined,
      termo: typeof req.query.termo === "string" ? req.query.termo : undefined,
      limite: Math.min(Number(req.query.limite) || 50, 100)
    };
    try {
      const sinais = await listarSinaisAngola(pool, req.auth, filtros);
      return res.json({
        ok: true,
        organizacao_id: req.auth.organizacaoId,
        total: sinais.length,
        sinais
      });
    } catch (erro) {
      console.error("[TuringAngola] sinais:", erro.message);
      return res.status(500).json({ ok: false, erro: "Falha ao consultar sinais Angola" });
    }
  });

  return router;
}

module.exports = criarRotasTuringAngola;
