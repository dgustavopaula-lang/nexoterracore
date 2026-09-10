"use strict";

const {
  calcularCenariosLoteamento
} = require("./loteamento-cenarios");

function numeroBR(valor) {
  let s = String(valor).trim();

  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(valor);
}

function percentual(valor) {
  return `${Number(valor).toLocaleString("pt-BR", {
    maximumFractionDigits: 2
  })}%`;
}

function interpretarLoteamentoEconomico(texto) {
  if (!texto || typeof texto !== "string") return null;

  const pergunta = texto.toLowerCase();

  const querVgv =
    /\bvgv\b|valor geral de vendas|faturamento/.test(pergunta);

  const querLucro =
    /\blucro\b/.test(pergunta);

  const querMargem =
    /\bmargem\b/.test(pergunta);

  if (!querVgv && !querLucro && !querMargem) {
    return null;
  }

  const qtdMatch =
    texto.match(/(\d[\d.]*)\s+lotes?\b/i);

  const loteMatch =
    texto.match(/lotes?\s+de\s+([\d.]+(?:,\d+)?)\s*m(?:²|2)/i);

  const precoM2Match =
    texto.match(
      /R\$\s*([\d.]+(?:,\d+)?)\s*(?:\/|por\s+)m(?:²|2)/i
    );

  const precoLoteMatch =
    texto.match(
      /R\$\s*([\d.]+(?:,\d+)?)\s*(?:por\s+lote|cada\s+lote|cada)/i
    );

  const custoMatch =
    texto.match(
      /custo(?:\s+total)?(?:\s+de|\s*[:=])?\s*R\$\s*([\d.]+(?:,\d+)?)/i
    );

  if (!qtdMatch || !loteMatch) {
    return {
      resposta:
        "Informe a quantidade de lotes e o tamanho de cada lote para calcular.",
      fontes: ["turing:loteamento-economico:v1"],
      dados: { motor: "loteamento-economico" }
    };
  }

  const quantidade = numeroBR(qtdMatch[1]);
  const tamanhoLoteM2 = numeroBR(loteMatch[1]);

  const precoPorM2 =
    precoM2Match ? numeroBR(precoM2Match[1]) : null;

  const precoPorLote =
    precoLoteMatch ? numeroBR(precoLoteMatch[1]) : null;

  const custoTotal =
    custoMatch ? numeroBR(custoMatch[1]) : null;

  if (
    !quantidade ||
    !tamanhoLoteM2 ||
    (precoPorM2 === null && precoPorLote === null)
  ) {
    return {
      resposta:
        "Informe também o preço por m² ou o preço por lote.",
      fontes: ["turing:loteamento-economico:v1"],
      dados: { motor: "loteamento-economico" }
    };
  }

  const areaConsideradaM2 =
    quantidade * tamanhoLoteM2;

  const resultado =
    calcularCenariosLoteamento({
      areaTotalM2: areaConsideradaM2,
      areaConsideradaM2,
      tamanhosLoteM2: [tamanhoLoteM2],
      precoPorM2,
      precoPorLote,
      custoTotal
    });

  const cenario = resultado.cenarios[0];

  if (querLucro && custoTotal === null) {
    return {
      resposta:
        `O VGV estimado é ${moeda(cenario.vgv)}. ` +
        "Para calcular o lucro, informe também o custo total do projeto.",
      fontes: [
        "turing:loteamento-economico:v1",
        "nexoterracore:loteamento-cenarios"
      ],
      dados: cenario
    };
  }

  if (querMargem && custoTotal === null) {
    return {
      resposta:
        `O VGV estimado é ${moeda(cenario.vgv)}. ` +
        "Para calcular a margem, informe também o custo total do projeto.",
      fontes: [
        "turing:loteamento-economico:v1",
        "nexoterracore:loteamento-cenarios"
      ],
      dados: cenario
    };
  }

  let resposta =
    `VGV estimado: ${moeda(cenario.vgv)}.`;

  if (cenario.lucroEstimado !== null) {
    resposta +=
      ` Lucro estimado: ${moeda(cenario.lucroEstimado)}.`;
  }

  if (cenario.margemLucroPercentual !== null) {
    resposta +=
      ` Margem estimada: ${percentual(
        cenario.margemLucroPercentual
      )}.`;
  }

  return {
    resposta,
    fontes: [
      "turing:loteamento-economico:v1",
      "nexoterracore:loteamento-cenarios"
    ],
    dados: {
      motor: "loteamento-economico",
      quantidade,
      tamanhoLoteM2,
      areaConsideradaM2,
      ...cenario
    }
  };
}

module.exports = { interpretarLoteamentoEconomico };
