"use strict";

function numeroBR(texto) {
  let s = String(texto).trim();

  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatarNumero(n) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8
  }).format(n);
}

function calcularMatematica(texto) {
  if (!texto || typeof texto !== "string") return null;

  const pergunta = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Linguagem natural: área disponível / tamanho do lote
  const contextoLoteamento =
    /\barea\b/.test(pergunta) &&
    /\blotes?\b/.test(pergunta) &&
    /\b(quanto|quantos|cabem|cabe|dividir|dividida|dividido)\b/.test(pergunta);

  if (contextoLoteamento) {
    const numeros =
      texto.match(/-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?|-?\d+(?:\.\d+)?/g);

    if (numeros && numeros.length >= 2) {
      const areaM2 = numeroBR(numeros[0]);
      const loteM2 = numeroBR(numeros[1]);

      if (
        areaM2 !== null &&
        loteM2 !== null &&
        areaM2 > 0 &&
        loteM2 > 0
      ) {
        const quantidade = Math.floor(areaM2 / loteM2);
        const sobraM2 = areaM2 - quantidade * loteM2;

        return {
          resposta:
            `Cabem ${formatarNumero(quantidade)} lotes inteiros de ` +
            `${formatarNumero(loteM2)} m². ` +
            `Sobra ${formatarNumero(sobraM2)} m².`,
          fontes: ["turing:math-engine:v1"],
          dados: {
            motor: "math",
            contexto: "loteamento",
            areaM2,
            loteM2,
            quantidade,
            sobraM2
          }
        };
      }
    }
  }

  let operacao = null;
  let simbolo = null;

  if (/\b(dividido\s+por|dividir\s+por|divisao\s+por)\b|\/+/i.test(pergunta)) {
    operacao = "divisão";
    simbolo = "/";
  } else if (/\b(multiplicado\s+por|multiplicar\s+por|vezes)\b|[*×]/i.test(pergunta)) {
    operacao = "multiplicação";
    simbolo = "*";
  } else if (/\bmais\b|\+/i.test(pergunta)) {
    operacao = "adição";
    simbolo = "+";
  } else if (/\bmenos\b/i.test(pergunta)) {
    operacao = "subtração";
    simbolo = "-";
  } else {
    return null;
  }

  const encontrados =
    texto.match(/-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?|-?\d+(?:\.\d+)?/g);

  if (!encontrados || encontrados.length < 2) return null;

  const a = numeroBR(encontrados[0]);
  const b = numeroBR(encontrados[1]);

  if (a === null || b === null) return null;

  let resultado;

  switch (simbolo) {
    case "/":
      if (b === 0) {
        return {
          resposta: "Não é possível dividir por zero.",
          fontes: ["turing:math-engine:v1"],
          dados: { motor: "math", erro: "divisao_por_zero" }
        };
      }
      resultado = a / b;
      break;

    case "*":
      resultado = a * b;
      break;

    case "+":
      resultado = a + b;
      break;

    case "-":
      resultado = a - b;
      break;

    default:
      return null;
  }

  return {
    resposta: `O resultado é ${formatarNumero(resultado)}.`,
    fontes: ["turing:math-engine:v1"],
    dados: {
      motor: "math",
      operacao,
      operandos: [a, b],
      resultado
    }
  };
}

module.exports = { calcularMatematica };
