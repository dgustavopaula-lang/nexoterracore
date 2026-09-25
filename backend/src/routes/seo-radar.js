const express = require("express");

const RADAR_INTERNO = "http://127.0.0.1:3101/api/seo/radar";

function criarRouterSeoRadar({ autenticar, autorizar, fetchImpl = fetch }) {
  const router = express.Router();

  router.get(
    "/radar/v1",
    autenticar,
    autorizar("control_plane", "GET"),
    async (req, res) => {
      const organizacaoId = req.auth?.organizacaoId;
      const fazendaId = req.auth?.fazendaId ?? null;
      const palavra = req.query.q;

      res.set("Cache-Control", "private, no-store");

      if (!Number.isSafeInteger(organizacaoId) || organizacaoId <= 0) {
        return res.status(403).json({ erro: "Contexto de organizacao obrigatorio." });
      }

      if (
        typeof palavra !== "string" ||
        palavra.trim().length === 0 ||
        palavra.trim().length > 120
      ) {
        return res.status(400).json({ erro: "Informe uma palavra-chave de ate 120 caracteres." });
      }

      const destino = new URL(RADAR_INTERNO);
      destino.searchParams.set("q", palavra.trim());

      const controlador = new AbortController();
      const limite = setTimeout(() => controlador.abort(), 5000);

      try {
        const resposta = await fetchImpl(destino, {
          method: "GET",
          signal: controlador.signal,
          headers: { Accept: "application/json" }
        });

        if (!resposta.ok) {
          return res.status(502).json({ erro: "Radar SEO indisponivel." });
        }

        const dados = await resposta.json();

        if (!dados || !Array.isArray(dados.keywords)) {
          return res.status(502).json({ erro: "Resposta invalida do Radar SEO." });
        }

        const keywords = dados.keywords
          .slice(0, 30)
          .filter((item) => typeof item?.keyword === "string")
          .map((item) => ({
            keyword: item.keyword,
            origem: "expansao_local"
          }));

        return res.json({
          ok: true,
          query: palavra.trim(),
          keywords,
          contexto: { organizacaoId, fazendaId },
          origem: "radar-local",
          metricasReais: false
        });
      } catch {
        return res.status(502).json({ erro: "Falha de comunicacao com Radar SEO." });
      } finally {
        clearTimeout(limite);
      }
    }
  );

  return router;
}

module.exports = { criarRouterSeoRadar };
