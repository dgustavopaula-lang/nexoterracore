"use strict";

const express = require("express");

function segredo(nome) {
  const valor = process.env[nome] || "";
  if (!valor) return "";
  return Buffer.from(valor, "base64").toString("utf8");
}

async function obterTokenCDSE() {
  const clientId = segredo("CDSE_CLIENT_ID_B64");
  const clientSecret = segredo("CDSE_CLIENT_SECRET_B64");

  if (!clientId || !clientSecret) {
    throw new Error("CDSE OAuth não configurado.");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });

  const resposta = await fetch(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok || !dados.access_token) {
    throw new Error(
      dados.error_description ||
      dados.error ||
      `OAuth CDSE HTTP ${resposta.status}`
    );
  }

  return dados.access_token;
}

function numero(valor, nome) {
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    throw new Error(`${nome} inválido.`);
  }
  return n;
}

module.exports = function criarRotasGeoSentinel2({ autenticar }) {
  if (typeof autenticar !== "function") {
    throw new Error("autenticar é obrigatório.");
  }

  const router = express.Router();

  router.use(autenticar);

  router.get("/sentinel2/latest", async (req, res) => {
    try {
      /*
       * Padrão inicial:
       * Uberlândia / Triângulo Mineiro
       *
       * Pode ser alterado pelo painel via lat/lon.
       */
      const lat = numero(req.query.lat ?? -18.9186, "lat");
      const lon = numero(req.query.lon ?? -48.2772, "lon");

      const diasSolicitados = Number(req.query.days ?? 30);
      const dias = Number.isFinite(diasSolicitados)
        ? Math.min(Math.max(Math.trunc(diasSolicitados), 1), 90)
        : 30;

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          ok: false,
          erro: "Coordenadas inválidas."
        });
      }

      const agora = new Date();
      const inicio = new Date(
        agora.getTime() - dias * 24 * 60 * 60 * 1000
      );

      /*
       * Cerca de 10 km ao redor do ponto.
       * Não representa limite municipal.
       */
      const margem = 0.09;

      const token = await obterTokenCDSE();

      const resposta = await fetch(
        "https://sh.dataspace.copernicus.eu/catalog/v1/search",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            collections: ["sentinel-2-l2a"],
            bbox: [
              lon - margem,
              lat - margem,
              lon + margem,
              lat + margem
            ],
            datetime:
              `${inicio.toISOString()}/${agora.toISOString()}`,
            limit: 20
          })
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        return res.status(502).json({
          ok: false,
          erro: dados?.message ||
                dados?.detail ||
                `Sentinel Hub HTTP ${resposta.status}`
        });
      }

      const cenas = Array.isArray(dados.features)
        ? dados.features
        : [];

      cenas.sort((a, b) => {
        const ad = Date.parse(
          a?.properties?.datetime ||
          a?.properties?.["datetime"] ||
          0
        );

        const bd = Date.parse(
          b?.properties?.datetime ||
          b?.properties?.["datetime"] ||
          0
        );

        return bd - ad;
      });

      const cena = cenas[0];

      if (!cena) {
        return res.json({
          ok: true,
          encontrado: false,
          fonte: "Copernicus Data Space Ecosystem / Sentinel-2 L2A",
          consulta: {
            lat,
            lon,
            dias
          }
        });
      }

      const props = cena.properties || {};

      return res.json({
        ok: true,
        encontrado: true,

        fonte:
          "Copernicus Data Space Ecosystem / Sentinel-2 L2A",

        localConsulta: {
          nome: req.query.nome || "Uberlândia",
          lat,
          lon
        },

        cena: {
          id: cena.id || null,
          colecao: cena.collection || "sentinel-2-l2a",

          capturadaEm:
            props.datetime ||
            props.start_datetime ||
            null,

          nuvens:
            props["eo:cloud_cover"] ??
            props.cloudCover ??
            null,

          bbox: cena.bbox || null
        },

        consulta: {
          periodoDias: dias,
          consultadoEm: new Date().toISOString()
        }
      });

    } catch (erro) {
      console.error("Sentinel-2:", erro);

      return res.status(500).json({
        ok: false,
        erro: "Não foi possível consultar Sentinel-2."
      });
    }
  });

  return router;
};
