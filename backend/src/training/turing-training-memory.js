"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/*
 * Palavras muito comuns não devem aumentar similaridade.
 */
const STOPWORDS = new Set([
  "a","o","as","os",
  "um","uma","uns","umas",
  "de","da","do","das","dos",
  "e","ou",
  "em","no","na","nos","nas",
  "para","por","com","sem",
  "que","se",
  "seu","sua","seus","suas",
  "meu","minha","meus","minhas",
  "ele","ela","eles","elas",
  "foi","ser","esta","está",
  "isso","isto",
  "ola","olá"
]);

/*
 * Pesos lexicais.
 * Quanto maior o peso, mais aquele termo influencia
 * uma memória aprovada.
 *
 * Não são regras de classificação isoladas.
 * Servem apenas para similaridade supervisionada.
 */
const PESOS = {
  senha: 2.8,
  conta: 2.2,
  bloquead: 2.7,
  link: 2.3,
  confirme: 2.5,
  confirm: 2.5,
  dados: 1.8,
  pix: 3.0,
  premio: 2.8,
  ganh: 2.4,
  urgent: 2.5,
  transfer: 2.5,
  dinheiro: 2.0,

  cadastro: 1.8,
  selecion: 2.0,
  respond: 2.0,
  imediat: 2.2,

  promoc: 2.0,
  desconto: 2.0,
  oferta: 1.8,
  compre: 1.8
};

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Canonicalização leve.
 *
 * Não é stemming linguístico completo.
 * Só reduz variações muito previsíveis,
 * evitando aproximações excessivamente agressivas.
 */
function canonicalizar(token = "") {
  let t = token;

  if (/^respond/.test(t)) return "respond";
  if (/^selecion/.test(t)) return "selecion";
  if (/^bloquead/.test(t)) return "bloquead";
  if (/^confirm/.test(t)) return "confirm";
  if (/^imediat/.test(t)) return "imediat";
  if (/^promoc/.test(t)) return "promoc";
  if (/^transfer/.test(t)) return "transfer";
  if (/^ganh/.test(t)) return "ganh";

  if (t.length > 5 && t.endsWith("s")) {
    t = t.slice(0, -1);
  }

  return t;
}

function tokenizar(texto = "") {
  return normalizar(texto)
    .split(" ")
    .filter(Boolean)
    .filter(token => token.length >= 3)
    .filter(token => !STOPWORDS.has(token))
    .map(canonicalizar);
}

function pesoToken(token) {
  return PESOS[token] || 1;
}

function arquivoAprovados() {
  return path.join(
    process.cwd(),
    "data",
    "turing-training",
    "approved.jsonl"
  );
}

function gerarId(mensagem) {
  return crypto
    .createHash("sha256")
    .update(normalizar(mensagem))
    .digest("hex");
}

function carregarAprovados() {
  const arquivo = arquivoAprovados();

  if (!fs.existsSync(arquivo)) {
    return [];
  }

  return fs
    .readFileSync(arquivo, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(linha => {
      try {
        return JSON.parse(linha);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter(item => item.status === "approved");
}

function buscarAprovado(mensagem) {
  const id = gerarId(mensagem);

  return carregarAprovados()
    .slice()
    .reverse()
    .find(item => item.id === id) || null;
}

function somaPesos(tokens) {
  return [...new Set(tokens)]
    .reduce(
      (total, token) =>
        total + pesoToken(token),
      0
    );
}

/*
 * Retorna várias métricas.
 *
 * - jaccardPonderado:
 *   interseção ponderada / união ponderada
 *
 * - coberturaReferencia:
 *   quanto da memória aprovada apareceu na mensagem
 *
 * - coberturaEntrada:
 *   quanto da entrada encontrou apoio na memória
 *
 * - compartilhados:
 *   evidência lexical real
 */
function medirSimilaridade(a, b) {
  const tokensA = [...new Set(tokenizar(a))];
  const tokensB = [...new Set(tokenizar(b))];

  const A = new Set(tokensA);
  const B = new Set(tokensB);

  const compartilhados =
    tokensA.filter(token => B.has(token));

  if (
    A.size === 0 ||
    B.size === 0 ||
    compartilhados.length === 0
  ) {
    return {
      score: 0,
      jaccardPonderado: 0,
      coberturaReferencia: 0,
      coberturaEntrada: 0,
      compartilhados: [],
      pesoCompartilhado: 0
    };
  }

  const uniao =
    [...new Set([...tokensA, ...tokensB])];

  const pesoCompartilhado =
    somaPesos(compartilhados);

  const pesoUniao =
    somaPesos(uniao);

  const pesoA =
    somaPesos(tokensA);

  const pesoB =
    somaPesos(tokensB);

  const jaccardPonderado =
    pesoUniao > 0
      ? pesoCompartilhado / pesoUniao
      : 0;

  /*
   * B = memória aprovada.
   * Cobertura alta significa que boa parte
   * do padrão humano aprovado reapareceu.
   */
  const coberturaReferencia =
    pesoB > 0
      ? pesoCompartilhado / pesoB
      : 0;

  const coberturaEntrada =
    pesoA > 0
      ? pesoCompartilhado / pesoA
      : 0;

  /*
   * Score combinado.
   *
   * Jaccard reduz coincidências parciais exageradas.
   * Cobertura da referência recompensa paráfrases
   * que preservam o núcleo do padrão aprovado.
   */
  const score =
    (
      jaccardPonderado * 0.55 +
      coberturaReferencia * 0.30 +
      coberturaEntrada * 0.15
    );

  return {
    score,
    jaccardPonderado,
    coberturaReferencia,
    coberturaEntrada,
    compartilhados,
    pesoCompartilhado
  };
}

/*
 * Compatibilidade com testes anteriores.
 */
function similaridadeJaccard(a, b) {
  return medirSimilaridade(a, b).score;
}

/*
 * Proteções:
 *
 * 1. Pelo menos duas evidências lexicais.
 * 2. Peso compartilhado mínimo.
 * 3. Memórias concorrentes próximas entram em conflito.
 * 4. Não promove classificação automática apenas
 *    porque uma única palavra forte coincidiu.
 */
function buscarSimilar(
  mensagem,
  {
    limiteBusca = 0.40,
    margemConflito = 0.08
  } = {}
) {
  const aprovados = carregarAprovados();

  const candidatos = aprovados
    .map(item => {
      const metricas =
        medirSimilaridade(
          mensagem,
          item.mensagem
        );

      return {
        ...item,
        similaridade: metricas.score,
        metricas
      };
    })
    .filter(item =>
      item.similaridade >= limiteBusca &&
      item.metricas.compartilhados.length >= 2 &&
      item.metricas.pesoCompartilhado >= 2.5
    )
    .sort(
      (a, b) =>
        b.similaridade -
        a.similaridade
    );

  if (candidatos.length === 0) {
    return null;
  }

  const melhor = candidatos[0];

  /*
   * Melhor candidato de OUTRA classe.
   */
  const concorrenteOutraClasse =
    candidatos.find(
      item =>
        item.classificacao !==
        melhor.classificacao
    );

  if (
    concorrenteOutraClasse &&
    Math.abs(
      melhor.similaridade -
      concorrenteOutraClasse.similaridade
    ) < margemConflito
  ) {
    return {
      conflito: true,
      melhor,
      segundo:
        concorrenteOutraClasse
    };
  }

  return {
    conflito: false,
    melhor
  };
}

function promover({
  mensagem,
  classificacao
}) {
  const arquivo = arquivoAprovados();

  fs.mkdirSync(
    path.dirname(arquivo),
    {
      recursive: true
    }
  );

  const id = gerarId(mensagem);

  const existente =
    buscarAprovado(mensagem);

  if (
    existente &&
    existente.classificacao ===
      classificacao
  ) {
    return {
      criado: false,
      registro: existente
    };
  }

  const registro = {
    id,
    horario:
      new Date().toISOString(),
    mensagem,
    classificacao,
    origem:
      "feedback_humano_aprovado",
    status: "approved"
  };

  fs.appendFileSync(
    arquivo,
    JSON.stringify(registro) + "\n",
    "utf8"
  );

  return {
    criado: true,
    registro
  };
}

module.exports = {
  normalizar,
  canonicalizar,
  tokenizar,
  pesoToken,
  gerarId,
  carregarAprovados,
  buscarAprovado,
  medirSimilaridade,
  similaridadeJaccard,
  buscarSimilar,
  promover
};
