const express = require("express");

function criarRotasTuringCentroOeste({ pool, autenticar }) {
  const router = express.Router();
  router.use(autenticar);
  router.use((req, res, next) => {
    if (req.auth?.tipo === "api_key") {
      return res.status(403).json({ ok: false, erro: "Acesso não autorizado." });
    }

    const perfis = req.auth?.perfis || [];
    if (!perfis.some(p => ["proprietario", "administrador"].includes(p))) {
      return res.status(403).json({ ok: false, erro: "Permissão insuficiente." });
    }

    next();
  });

  router.get("/oportunidades", async (req, res) => {
    try {
      const organizacaoId = Number(req.auth?.organizacaoId);

      if (!Number.isInteger(organizacaoId) || organizacaoId <= 0) {
        return res.status(400).json({
          ok: false,
          erro: "organizacao_id invalido"
        });
      }

      const resultado = await pool.query(
        `
        SELECT
          id,
          empresa,
          municipio,
          estado,
          setor,
          tipo_evidencia,
          evidencia,
          fonte,
          decisor,
          contato,
          oportunidade,
          proxima_acao,
          prioridade,
          score,
          status,
          criado_em,
          atualizado_em
        FROM turing_centro_oeste_oportunidades
        WHERE organizacao_id = $1
        ORDER BY score DESC NULLS LAST, empresa
        `,
        [organizacaoId]
      );

      return res.json({
        ok: true,
        organizacao_id: organizacaoId,
        total: resultado.rowCount,
        oportunidades: resultado.rows
      });

    } catch (erro) {
      console.error("Turing Centro-Oeste:", erro);

      return res.status(500).json({
        ok: false,
        erro: "Falha ao consultar radar Centro-Oeste"
      });
    }
  });

  router.get("/resumo", async (req, res) => {
    try {
      const organizacaoId = Number(req.auth?.organizacaoId);

      if (!Number.isInteger(organizacaoId) || organizacaoId <= 0) {
        return res.status(400).json({
          ok: false,
          erro: "organizacao_id invalido"
        });
      }

      const resultado = await pool.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE prioridade='ALTA')::int AS alta,
          COUNT(*) FILTER (WHERE prioridade='MEDIA')::int AS media,
          COUNT(*) FILTER (
            WHERE tipo_evidencia='FATO_VERIFICADO'
          )::int AS fatos,
          COUNT(*) FILTER (
            WHERE tipo_evidencia='SINAL_DE_MERCADO'
          )::int AS sinais,
          COUNT(*) FILTER (
            WHERE tipo_evidencia='HIPOTESE_COMERCIAL'
          )::int AS hipoteses
        FROM turing_centro_oeste_oportunidades
        WHERE organizacao_id=$1
        `,
        [organizacaoId]
      );

      return res.json({
        ok: true,
        organizacao_id: organizacaoId,
        ...resultado.rows[0]
      });

    } catch (erro) {
      console.error("Turing Centro-Oeste:", erro);

      return res.status(500).json({
        ok: false,
        erro: "Falha ao gerar resumo Centro-Oeste"
      });
    }
  });

  return router;
}

module.exports = criarRotasTuringCentroOeste;
