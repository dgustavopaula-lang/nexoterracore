"use strict";

const crypto = require("crypto");

const VERSAO = "2.0";
const MAX_CONTEUDO = 6000;
const TIPOS = new Set(["mensagem", "link", "email"]);

const REGRAS = [
  {
    id: "DINHEIRO",
    peso: 24,
    regex: /\b(pix|transfer[eê]ncia|transferir|dep[oó]sito|pagamento|pagar|boleto)\b/i,
    descricao: "Pedido ou referência financeira"
  },
  {
    id: "URGENCIA",
    peso: 18,
    regex: /\b(urgente|agora|imediatamente|r[aá]pido|emerg[eê]ncia|hoje mesmo)\b/i,
    descricao: "Pressão ou linguagem de urgência"
  },
  {
    id: "TROCA_NUMERO",
    peso: 30,
    regex: /\b(n[uú]mero novo|troquei de n[uú]mero|celular novo|meu celular (quebrou|estragou|parou))\b/i,
    descricao: "Alegação de troca de telefone ou número"
  },
  {
    id: "CREDENCIAL",
    peso: 40,
    regex: /\b(senha|token|otp|c[oó]digo de verifica[cç][aã]o|c[oó]digo recebido|c[oó]digo do sms)\b/i,
    descricao: "Referência a senha, token ou código de verificação"
  },
  {
    id: "AMEACA_CONTA",
    peso: 24,
    regex: /\b(conta (bloqueada|suspensa)|acesso bloqueado|evitar bloqueio|regularize sua conta|conta ser[aá] cancelada)\b/i,
    descricao: "Pressão envolvendo bloqueio ou suspensão"
  },
  {
    id: "PREMIO",
    peso: 20,
    regex: /\b(pr[eê]mio|ganhou|sorteado|resgate agora|parab[eé]ns.{0,20}ganhou)\b/i,
    descricao: "Promessa inesperada de prêmio ou benefício"
  },
  {
    id: "IDENTIDADE",
    peso: 15,
    regex: /\b(sou eu|seu filho|sua filha|seu irm[aã]o|sua irm[aã]|pai|m[aã]e)\b/i,
    descricao: "Possível alegação de identidade pessoal/familiar"
  },
  {
    id: "CLIQUE",
    peso: 10,
    regex: /\b(clique aqui|acesse agora|confirme aqui|abra o link|toque no link)\b/i,
    descricao: "Incentivo para abrir link ou página"
  }
];

function erroSeguro(statusCode, codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  erro.codigo = codigo;
  return erro;
}

function normalizarTipo(tipo) {
  const valor = String(tipo || "mensagem").trim().toLowerCase();

  if (!TIPOS.has(valor)) {
    throw erroSeguro(
      400,
      "TIPO_INVALIDO",
      "Tipo de análise inválido."
    );
  }

  return valor;
}

function normalizarConteudo(valor) {
  if (typeof valor !== "string") {
    throw erroSeguro(
      400,
      "CONTEUDO_INVALIDO",
      "Conteúdo deve ser texto."
    );
  }

  const texto = valor
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!texto) {
    throw erroSeguro(
      400,
      "CONTEUDO_VAZIO",
      "Conteúdo obrigatório."
    );
  }

  if (texto.length > MAX_CONTEUDO) {
    throw erroSeguro(
      413,
      "CONTEUDO_EXCEDIDO",
      `Conteúdo excede ${MAX_CONTEUDO} caracteres.`
    );
  }

  return texto;
}

function extrairUrls(texto) {
  return texto.match(/https?:\/\/[^\s<>"']+/gi) || [];
}

function analisarUrl(url) {
  const sinais = [];

  try {
    const u = new URL(url);

    if (!["http:", "https:"].includes(u.protocol)) {
      sinais.push({
        id: "PROTOCOLO_URL",
        peso: 20,
        descricao: "Protocolo de link não esperado"
      });
    }

    if (u.protocol === "http:") {
      sinais.push({
        id: "HTTP_SEM_TLS",
        peso: 15,
        descricao: "Link utiliza HTTP sem HTTPS"
      });
    }

    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(u.hostname)) {
      sinais.push({
        id: "URL_IP",
        peso: 25,
        descricao: "Link utiliza endereço IP diretamente"
      });
    }

    if (u.hostname.includes("xn--")) {
      sinais.push({
        id: "PUNYCODE",
        peso: 20,
        descricao: "Domínio internacionalizado requer verificação adicional"
      });
    }

    if (u.hostname.split(".").length > 4) {
      sinais.push({
        id: "SUBDOMINIOS",
        peso: 10,
        descricao: "Estrutura incomum de subdomínios"
      });
    }

    if (u.username || u.password) {
      sinais.push({
        id: "URL_CREDENCIAL_EMBUTIDA",
        peso: 25,
        descricao: "Link contém informação de autenticação embutida"
      });
    }

  } catch {
    sinais.push({
      id: "URL_INVALIDA",
      peso: 15,
      descricao: "Formato de link inconsistente"
    });
  }

  return sinais;
}

function analisarConteudo(conteudo, tipoEntrada = "mensagem") {
  const tipo = normalizarTipo(tipoEntrada);
  const texto = normalizarConteudo(conteudo);

  const encontrados = [];

  for (const regra of REGRAS) {
    if (regra.regex.test(texto)) {
      encontrados.push({
        id: regra.id,
        peso: regra.peso,
        descricao: regra.descricao
      });
    }
  }

  const urls = extrairUrls(texto).slice(0, 10);

  for (const url of urls) {
    encontrados.push(...analisarUrl(url));
  }

  const ids = new Set(encontrados.map(item => item.id));

  let score = encontrados.reduce(
    (total, item) => total + item.peso,
    0
  );

  // Correlações de engenharia social.
  if (
    ids.has("DINHEIRO") &&
    (ids.has("URGENCIA") || ids.has("TROCA_NUMERO"))
  ) {
    score += 15;
  }

  if (
    ids.has("IDENTIDADE") &&
    ids.has("TROCA_NUMERO") &&
    ids.has("DINHEIRO")
  ) {
    score += 15;
  }

  if (
    ids.has("CREDENCIAL") &&
    (ids.has("URGENCIA") || ids.has("AMEACA_CONTA"))
  ) {
    score += 15;
  }

  score = Math.min(100, score);

  let nivel = "BAIXO";

  if (score >= 70) {
    nivel = "ALTO";
  } else if (score >= 35) {
    nivel = "MEDIO";
  }

  const recomendacoes = [];

  if (nivel === "ALTO") {
    recomendacoes.push(
      "Interrompa a ação e confirme a situação por um canal independente antes de pagar ou fornecer informações."
    );
  }

  if (ids.has("TROCA_NUMERO") || ids.has("IDENTIDADE")) {
    recomendacoes.push(
      "Confirme a identidade usando um contato que você já conhecia."
    );
  }

  if (ids.has("CREDENCIAL")) {
    recomendacoes.push(
      "Não compartilhe senha, token ou código de verificação."
    );
  }

  if (urls.length) {
    recomendacoes.push(
      "Não abra o link enquanto remetente e destino não forem confirmados."
    );
  }

  if (!recomendacoes.length) {
    recomendacoes.push(
      "Nenhum indicador forte foi encontrado. Isso não garante que o conteúdo seja legítimo."
    );
  }

  /*
   * PRIVACY BY DEFAULT:
   * - não retorna conteúdo;
   * - não retorna URLs;
   * - não cria hash do conteúdo;
   * - não persiste mensagem;
   * - somente resultado técnico mínimo.
   */
  return {
    produto: "NexoSafe",
    versao_motor: VERSAO,
    tipo,

    risco: {
      score,
      nivel
    },

    indicadores: encontrados.map(({ id, descricao }) => ({
      id,
      descricao
    })),

    links_encontrados: urls.length,

    recomendacoes,

    privacidade: {
      conteudo_persistido: false,
      conteudo_retornado: false,
      politica: "privacy_by_default"
    },

    aviso:
      "Análise preventiva baseada em indicadores. O resultado não confirma nem exclui fraude.",

    analise_id: crypto.randomUUID(),
    analisado_em: new Date().toISOString()
  };
}

module.exports = {
  analisarConteudo
};
