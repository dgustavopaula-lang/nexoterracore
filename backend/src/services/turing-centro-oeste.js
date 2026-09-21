const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(
  __dirname,
  "..",
  "data",
  "turing-centro-oeste.json"
);

function carregarBase() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function analisarOportunidade({
  empresa = "",
  municipio = "",
  estado = "GO",
  setor = "",
  evidencia = "",
  fonte = "",
  contato = ""
} = {}) {
  const base = carregarBase();

  const setorNormalizado = normalizar(setor);

  const perfil =
    base.setores_prioritarios.find((item) =>
      setorNormalizado.includes(normalizar(item.setor))
    ) || null;

  return {
    empresa,
    municipio,
    estado,
    setor,
    evidencia,
    fonte,
    contato,

    doresProvaveis: perfil ? perfil.dores : [],

    classificacao: perfil
      ? "SETOR_PRIORITARIO"
      : "ANALISAR",

    proximaAcao: perfil
      ? "Validar a dor com evidencia publica e identificar decisor."
      : "Pesquisar empresa, setor e sinais comerciais.",

    analisadoEm: new Date().toISOString()
  };
}

function listarSetores() {
  return carregarBase().setores_prioritarios;
}

function obterRadar() {
  return carregarBase();
}

module.exports = {
  carregarBase,
  analisarOportunidade,
  listarSetores,
  obterRadar
};
