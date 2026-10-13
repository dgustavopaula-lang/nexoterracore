"use strict";

const regras = {
  phishing: [
    "confirme sua senha",
    "informe sua senha",
    "solicita senha",
    "pedindo senha",
    "verifique sua conta",
    "clique no link",
    "link desconhecido",
    "conta sera bloqueada",
    "atualize sua senha",
    "atualize seus dados",
    "confirme seus dados"
  ],

  scam: [
    "voce ganhou",
    "premio",
    "pix urgente",
    "transfira agora",
    "oportunidade imperdivel",
    "retorno garantido"
  ],

  spam: [
    "promocao",
    "oferta",
    "compre agora",
    "desconto",
    "ultimas unidades",
    "imperdivel"
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
    const sinais = termos.filter(t => mensagem.includes(normalizar(t)));

    return {
      classe,
      pontos: sinais.length,
      sinais
    };
  });

  // Combinações de risco
  const temSenha = mensagem.includes("senha");
  const temLink = mensagem.includes("link");
  const temBanco = mensagem.includes("banco");
  const temWhatsApp = mensagem.includes("whatsapp");

  if (
    (temSenha && temLink) ||
    (temBanco && temSenha) ||
    (temWhatsApp && temSenha)
  ) {
    resultados.push({
      classe: "phishing",
      pontos: 2,
      sinais: ["combinacao_risco"]
    });
  }

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
    confianca: Math.min(0.65 + melhor.pontos * 0.15, 0.95),
    sinais: melhor.sinais
  };
}

module.exports = {
  classificar
};
