"use strict";

const regras = {
  phishing: [
    "confirme sua senha",
    "verifique sua conta",
    "clique no link",
    "conta será bloqueada",
    "atualize seus dados",
    "confirme seus dados"
  ],

  scam: [
    "você ganhou",
    "prêmio",
    "pix urgente",
    "transfira agora",
    "oportunidade imperdível",
    "retorno garantido"
  ],

  spam: [
    "promoção",
    "oferta",
    "compre agora",
    "desconto",
    "últimas unidades",
    "imperdível"
  ]
};

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function classificar(texto) {
  const mensagem = normalizar(texto);

  const resultados = Object.entries(regras).map(([classe, termos]) => {
    const sinais = termos.filter(t =>
      mensagem.includes(normalizar(t))
    );

    return {
      classe,
      pontos: sinais.length,
      sinais
    };
  });

  resultados.sort((a, b) => b.pontos - a.pontos);

  const melhor = resultados[0];

  if (!melhor || melhor.pontos === 0) {
    return {
      classe: "legitimo",
      confianca: 0.70,
      sinais: []
    };
  }

  return {
    classe: melhor.classe,
    confianca: Math.min(0.55 + melhor.pontos * 0.15, 0.95),
    sinais: melhor.sinais
  };
}

module.exports = {
  classificar
};
