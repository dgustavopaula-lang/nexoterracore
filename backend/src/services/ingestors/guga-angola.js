"use strict";

const BASE = {
  agente: "guga",
  coordenador: "turing",
  pais: "Angola",
  provincia: "Malanje",
  pesquisa: "RGPH 2024",
  fonte: "INE Angola - Censo 2024",
  data_referencia: "2024",
  status: "REAL",
  simulation: false
};

const TERRITORIOS = [
  {
    ...BASE,
    territorio: "Malanje",
    nivel: "provincia",
    indicador: "populacao_residente",
    valor: 1298250,
    unidade: "pessoas"
  },
  {
    ...BASE,
    territorio: "Cacuso",
    nivel: "municipio",
    indicador: "populacao_residente",
    valor: 55015,
    unidade: "pessoas"
  }
];

function consultarTerritorio(nome) {
  const termo = String(nome || "")
    .trim()
    .toLowerCase();

  return TERRITORIOS.filter(x =>
    x.territorio.toLowerCase() === termo
  );
}

function consultarMalanje() {
  return consultarTerritorio("Malanje");
}

function consultarCacuso() {
  return consultarTerritorio("Cacuso");
}

function contextoGuga() {
  return {
    agente: "guga",
    coordenador: "turing",
    dominio: [
      "Angola",
      "Malanje",
      "Cacuso"
    ],
    provedores: [
      {
        id: "ine_angola_rgph_2024",
        instituicao:
          "Instituto Nacional de Estatística de Angola",
        tipo: "censo",
        status: "OFICIAL"
      }
    ],
    politica: {
      inventar_dados: false,
      exigir_fonte: true,
      exigir_data_referencia: true
    },
    registros_validados: TERRITORIOS.length
  };
}

module.exports = {
  TERRITORIOS,
  consultarTerritorio,
  consultarMalanje,
  consultarCacuso,
  contextoGuga
};
