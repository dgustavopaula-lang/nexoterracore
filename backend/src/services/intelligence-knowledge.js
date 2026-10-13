"use strict";

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(
  __dirname,
  "../data/intelligence/fontes-reais.json"
);

function carregarBaseReal() {
  const base = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  if (!base?.politica || base.politica.inventar_dados !== false) {
    throw new Error("Política de dados reais inválida");
  }

  return base;
}

function obterAgente(nome) {
  const base = carregarBaseReal();
  const id = String(nome || "").trim().toLowerCase();

  return base.agentes?.[id] || null;
}

function consultarConhecimentoReal({ agente, territorio } = {}) {
  const base = carregarBaseReal();

  let dados = Array.isArray(base.conhecimento_validado)
    ? base.conhecimento_validado
    : [];

  if (agente) {
    const id = String(agente).toLowerCase();
    dados = dados.filter(
      item => String(item.agente || "").toLowerCase() === id
    );
  }

  if (territorio) {
    const termo = String(territorio).toLowerCase();
    dados = dados.filter(
      item => String(item.territorio || "")
        .toLowerCase()
        .includes(termo)
    );
  }

  return dados.map(item => ({
    ...item,
    confiabilidade: "FONTE_VALIDADA"
  }));
}

function contextoTuring() {
  const base = carregarBaseReal();

  return {
    chefe: "turing",
    papel: base.agentes.turing.papel,
    agentes: base.agentes.turing.coordena,
    politica: base.politica,
    fontes: Object.keys(base.fontes || {}),
    registros_reais: (base.conhecimento_validado || []).length
  };
}

module.exports = {
  carregarBaseReal,
  obterAgente,
  consultarConhecimentoReal,
  contextoTuring
};
