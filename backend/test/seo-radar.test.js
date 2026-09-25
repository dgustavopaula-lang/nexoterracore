const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { criarRouterSeoRadar } = require("../src/routes/seo-radar");

test("Radar SEO: autenticar, autorizar e isolar contexto", async () => {
  const app = express();
  const chamadas = [];

  function autenticar(req, res, next) {
    if (req.get("authorization") !== "Bearer sessao-teste") {
      return res.status(401).json({ erro: "Autenticacao necessaria." });
    }

    req.auth = { organizacaoId: 42, fazendaId: 7 };
    next();
  }

  function autorizar() {
    return (req, res, next) => {
      if (req.get("x-permissao") !== "permitir") {
        return res.status(403).json({ erro: "Permissao insuficiente." });
      }

      next();
    };
  }

  const fetchImpl = async (url) => {
    chamadas.push(String(url));
    return {
      ok: true,
      json: async () => ({
        keywords: [
          { keyword: "gestao rural", ocorrencias: 8 },
          { keyword: "gestao rural exemplos", ocorrencias: 7 }
        ]
      })
    };
  };

  app.use(
    "/api/seo",
    criarRouterSeoRadar({ autenticar, autorizar, fetchImpl })
  );

  const servidor = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => servidor.once("listening", resolve));

  const url = "http://127.0.0.1:" + servidor.address().port +
    "/api/seo/radar/v1?q=gestao-rural";

  try {
    const semSessao = await fetch(url);
    assert.equal(semSessao.status, 401);
    assert.equal(chamadas.length, 0);

    const semPermissao = await fetch(url, {
      headers: { authorization: "Bearer sessao-teste" }
    });
    assert.equal(semPermissao.status, 403);
    assert.equal(chamadas.length, 0);

    const cabecalhos = {
      authorization: "Bearer sessao-teste",
      "x-permissao": "permitir"
    };

    const consulta = await fetch(url, { headers: cabecalhos });
    assert.equal(consulta.status, 200);
    assert.equal(consulta.headers.get("cache-control"), "private, no-store");
    const dados = await consulta.json();
    assert.deepEqual(dados.contexto, { organizacaoId: 42, fazendaId: 7 });
    assert.equal(dados.metricasReais, false);
    assert.equal(dados.keywords.length, 2);
    assert.deepEqual(dados.keywords[0], {
      keyword: "gestao rural",
      origem: "expansao_local"
    });
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0], /127\.0\.0\.1:3101\/api\/seo\/radar/);

    const invalida = await fetch(
      url.split("?")[0] + "?q=" + "a".repeat(121),
      { headers: cabecalhos }
    );
    assert.equal(invalida.status, 400);
    assert.equal(chamadas.length, 1);
  } finally {
    await new Promise((resolve, reject) => {
      servidor.close((erro) => erro ? reject(erro) : resolve());
    });
  }
});
