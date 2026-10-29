"use strict";

/*
 * Turing Security Training — classificador por regras (v2)
 *
 * Mantém a mesma interface da v1: classificar(texto) -> { classe, confianca, sinais }
 *
 * Princípios:
 *  - Regras explícitas e auditáveis (cada sinal aparece em "sinais").
 *  - Sinal forte = 1 ponto; sinal fraco = 0,5 ponto. Só vira alerta com >= 1 ponto.
 *    Assim "desconto", "oferta" ou "prêmio" sozinhos NÃO acusam golpe.
 *  - Padrões combinam contexto (ex.: link + urgência; código + SMS), não palavra solta.
 *  - Sem evidência suficiente: "legitimo" (principal proteção contra falso positivo).
 */

// [termo, peso]
const termos = {
  phishing: [
    ["confirme sua senha", 1],
    ["informe sua senha", 1],
    ["solicita senha", 1],
    ["pedindo senha", 1],
    ["verifique sua conta", 1],
    ["clique no link", 1],
    ["link desconhecido", 1],
    ["conta sera bloqueada", 1],
    ["atualize sua senha", 1],
    ["atualize seus dados", 1],
    ["confirme seus dados", 1],
    ["acesso bloqueado", 1],
    ["conta suspensa", 1],
    ["conta sera encerrada", 1]
  ],

  scam: [
    ["voce ganhou", 1],
    ["premio", 0.5],
    ["pix urgente", 1],
    ["transfira agora", 1],
    ["oportunidade imperdivel", 1],
    ["retorno garantido", 1],
    ["lucro garantido", 1],
    ["sem risco", 1],
    ["dobre seu dinheiro", 1],
    ["troquei de numero", 0.5],
    ["taxa de inscricao", 1],
    ["taxa de liberacao", 1]
  ],

  spam: [
    ["promocao", 0.5],
    ["oferta", 0.5],
    ["desconto", 0.5],
    ["compre agora", 1],
    ["ultimas unidades", 1],
    ["imperdivel", 1],
    ["liquidacao", 1],
    ["frete gratis", 1],
    ["aproveite agora", 1],
    ["seguidores", 1],
    ["peca ja", 1],
    ["sem consulta", 1],
    ["milagroso", 1]
  ]
};

const RISCO_URL =
  /(bloquead|bloqueio|suspens|encerrad|regulariz|expira|pendente|retid|desbloque|suspeit|\bpin\b|senha|\bcpf\b|atualize (seus|sua|os|as)|confirme (seus|sua|os|as)|verifique (sua|seu|agora)|urgente|nao perder|taxa de liberacao)/;

const padroes = [
  // --- phishing
  {
    classe: "phishing", id: "link_com_urgencia", peso: 1,
    teste: m =>
      /(https?:\/\/|www\.|\bbit\.ly\/|\btinyurl\.com\/|\b[a-z0-9-]{3,}\.(com|net|org|info|xyz|top|click|link|site|online|example|ao|br)\b)/.test(m) &&
      RISCO_URL.test(m)
  },
  {
    classe: "phishing", id: "pedido_de_codigo", peso: 1,
    teste: m =>
      /(passe|envie|informe|mande|digite|compartilhe|fale|diga)\b.{0,50}\b(codigo|pin|token)\b.{0,60}(sms|whatsapp|verificacao|recebeu|chegou|digitos)/.test(m) ||
      /\b(codigo|pin|token)\b.{0,40}(sms|verificacao|recebeu|chegou|digitos).{0,40}(envie|informe|passe|mande|digite)/.test(m)
  },
  {
    classe: "phishing", id: "atividade_suspeita", peso: 1,
    teste: m => /(login|acesso|atividade)s? suspeit/.test(m)
  },
  {
    classe: "phishing", id: "conta_bloqueada_ou_suspensa", peso: 1,
    teste: m => /\b(conta|cartao|acesso|beneficio)\b.{0,30}(suspens|bloquead|encerrad|cancelad)/.test(m)
  },
  {
    classe: "phishing", id: "orgao_pedindo_regularizacao", peso: 1,
    teste: m =>
      /(receita federal|detran|inss|correios|multicaixa|paypal|netflix|mercado pago|banco)\b.{0,80}(regulariz|pendente|bloquead|suspens|verifique|atualize|confirme)/.test(m)
  },

  // --- scam
  {
    classe: "scam", id: "premio_ou_sorteio", peso: 1,
    teste: m => /(parabens|ganhou|contemplad|sorteado).{0,70}(premio|sorteio|kwanza|\bkz\b|\d{2,}\.?\d* ?(mil|reais|r\$|usd|dolar))/.test(m)
  },
  {
    classe: "scam", id: "taxa_adiantada", peso: 1,
    teste: m => /(pague|pagar|deposite|depositar|envie|transfira)\b.{0,40}\b(taxa|fianca|inscricao|adesao|cadastro|seguro|levantamento|desbloqueio)\b/.test(m)
  },
  {
    classe: "scam", id: "dinheiro_facil", peso: 1,
    teste: m =>
      /(ganhe|ganhar|ganho).{0,40}(por dia|por semana|em casa)/.test(m) ||
      /(lucro|retorno|rendimento|renda) (garantid|sem risco)/.test(m)
  },
  {
    classe: "scam", id: "pedido_pix_numero_novo", peso: 1,
    teste: m =>
      /(troquei de numero|novo numero|numero novo).{0,80}(pix|transfer|deposit|dinheiro)/.test(m) ||
      /(pix|transfer|deposit).{0,30}(urgente|agora|hoje).{0,40}(pago|devolvo|devolver|amanha)/.test(m)
  },
  {
    classe: "scam", id: "emergencia_familiar", peso: 1,
    teste: m => /(familiar|filho|filha|\bpai\b|\bmae\b|irmao|sobrinho).{0,50}(acidente|preso|sequestr|hospital|cirurgia).{0,80}(deposit|pix|transfer|fianca|pagar)/.test(m)
  },
  {
    classe: "scam", id: "heranca", peso: 1,
    teste: m => /(heranca|herdeiro).{0,100}(milhoes|milhao|taxa|liberar|transferencia)/.test(m)
  },
  {
    classe: "scam", id: "kwanza_com_taxa", peso: 1,
    teste: m => /(\bkz\b|kwanza).{0,80}(taxa|transfer|deposit)/.test(m) || /(taxa|transfer|deposit).{0,80}(\bkz\b|kwanza)/.test(m)
  },

  // --- spam
  {
    classe: "spam", id: "leve_mais", peso: 1,
    teste: m => /compre \d+ leve \d+|leve \d+ pague \d+/.test(m)
  },
  {
    classe: "spam", id: "emagrecimento", peso: 1,
    teste: m => /(emagre(ca|cer)|perca (peso|barriga)).{0,40}(kg|dias|rapido|shake|cha)/.test(m)
  },
  {
    classe: "spam", id: "divulgacao_em_massa", peso: 1,
    teste: m => /\d+ ?(mil )?contatos|divulgacao em massa|divulgue sua empresa/.test(m)
  }
];

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function classificar(texto) {
  const mensagem = normalizar(texto);
  const placar = { phishing: { pontos: 0, sinais: [] }, scam: { pontos: 0, sinais: [] }, spam: { pontos: 0, sinais: [] } };

  for (const [classe, lista] of Object.entries(termos)) {
    for (const [termo, peso] of lista) {
      if (mensagem.includes(normalizar(termo))) {
        placar[classe].pontos += peso;
        placar[classe].sinais.push(termo);
      }
    }
  }

  for (const p of padroes) {
    if (p.teste(mensagem)) {
      placar[p.classe].pontos += p.peso;
      placar[p.classe].sinais.push("padrao:" + p.id);
    }
  }

  // Combinações de risco (herdadas da v1)
  const temSenha = mensagem.includes("senha");
  const temLink = mensagem.includes("link");
  const temBanco = mensagem.includes("banco");
  const temWhatsApp = mensagem.includes("whatsapp");

  if ((temSenha && temLink) || (temBanco && temSenha) || (temWhatsApp && temSenha)) {
    placar.phishing.pontos += 2;
    placar.phishing.sinais.push("combinacao_risco");
  }

  // Empate: phishing > scam > spam (ordem de gravidade)
  const ordem = ["phishing", "scam", "spam"];
  const melhor = ordem
    .map(classe => ({ classe, ...placar[classe] }))
    .sort((a, b) => b.pontos - a.pontos)[0];

  if (!melhor || melhor.pontos < 1) {
    return { classe: "legitimo", confianca: 0.70, sinais: [] };
  }

  return {
    classe: melhor.classe,
    confianca: Math.min(0.65 + melhor.pontos * 0.15, 0.95),
    sinais: melhor.sinais
  };
}

module.exports = { classificar };
