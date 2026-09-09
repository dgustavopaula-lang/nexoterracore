const { consultarConhecimentoInterno } = require("./turing-knowledge");

function resposta(texto, fonte = "turing:publico") {
  return {
    resposta: String(texto).trim(),
    fontes: [fonte],
    dados: null
  };
}

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tentarCalculo(perguntaOriginal) {
  const p = normalizar(perguntaOriginal)
    .replace(/qual e o resultado de|quanto e|calcule|calcular|resultado de/g, "")
    .replace(/dividido por/g, "/")
    .replace(/vezes/g, "x")
    .replace(/mais/g, "+")
    .replace(/menos/g, "-")
    .replace(/[?!;:]+$/g, "")
    .trim();

  const m = p.match(
    /^(-?\d+(?:[.,]\d+)?)\s*(x|×|\*|\/|\+|-)\s*(-?\d+(?:[.,]\d+)?)$/
  );

  if (!m) return null;

  const a = Number(m[1].replace(",", "."));
  const b = Number(m[3].replace(",", "."));
  const op = m[2];

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  let r;

  if (op === "x" || op === "×" || op === "*") r = a * b;
  else if (op === "/") {
    if (b === 0) return resposta("Não é possível dividir por zero.", "turing:math");
    r = a / b;
  }
  else if (op === "+") r = a + b;
  else if (op === "-") r = a - b;
  else return null;

  return resposta(
    `${a.toLocaleString("pt-BR")} ${op} ${b.toLocaleString("pt-BR")} = ${r.toLocaleString("pt-BR")}.`,
    "turing:math"
  );
}

function conhecimentoPublicoBasico(perguntaOriginal) {
  const p = normalizar(perguntaOriginal);

  if (p.includes("socrates")) {
    return resposta(
      "Sócrates destacou o diálogo, o questionamento crítico e o exame da própria vida. O método socrático procura chegar a ideias mais claras por meio de perguntas."
    );
  }

  if (p.includes("filosofia")) {
    return resposta(
      "Filosofia é a investigação racional de questões sobre conhecimento, realidade, ética, linguagem, razão e existência."
    );
  }

  if (p.includes("inteligencia artificial") || /\bia\b/.test(p)) {
    return resposta(
      "Inteligência artificial reúne técnicas computacionais capazes de analisar informações, reconhecer padrões e produzir respostas ou decisões."
    );
  }

  if (p.includes("fotossintese")) {
    return resposta(
      "Fotossíntese é o processo pelo qual plantas e outros organismos usam luz para transformar água e dióxido de carbono em energia química, liberando oxigênio."
    );
  }

  if (p.includes("receita") && p.includes("lucro")) {
    return resposta(
      "Receita é o valor obtido pelas vendas ou serviços. Lucro é o que resta da receita depois de descontados custos e despesas."
    );
  }

  if (p.includes("alan turing")) {
    return resposta(
      "Alan Turing foi um matemático e cientista da computação britânico, fundamental para a teoria da computação e para o desenvolvimento inicial da inteligência artificial."
    );
  }

  if (p.includes("custo por hectare") || p.includes("custo por ha")) {
    return resposta(
      "Custo por hectare = custo total da operação ÷ número de hectares. Exemplo: R$ 10.000 em 100 ha corresponde a R$ 100 por hectare.",
      "turing:math"
    );
  }

  if (p.includes("ansiedade")) {
    return resposta(
      "Ansiedade é uma resposta de alerta envolvendo preocupação e tensão. Quando é intensa, persistente ou interfere na rotina, merece avaliação profissional."
    );
  }

  return null;
}

async function consultarModelo(pergunta) {
  const apiUrl = process.env.TURING_AI_URL;
  const apiKey = process.env.TURING_AI_KEY;
  const model = process.env.TURING_AI_MODEL;

  if (apiUrl && apiKey && model) {
    try {
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Você é Turing, agente público do NexoTerraCore. Responda em português, de forma objetiva, normalmente em 2 a 4 frases. Não invente dados privados, financeiros ou operacionais do usuário."
            },
            {
              role: "user",
              content: pergunta
            }
          ],
          temperature: 0.3,
          max_tokens: 250
        })
      });

      if (r.ok) {
        const data = await r.json();
        const texto =
          data?.choices?.[0]?.message?.content ||
          data?.response ||
          data?.answer;

        if (texto) return resposta(texto, "turing:modelo");
      }
    } catch (_) {}
  }

  const ollamaUrl =
    process.env.OLLAMA_URL ||
    (!process.env.RENDER ? "http://127.0.0.1:11434" : null);

  if (ollamaUrl) {
    try {
      const r = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "qwen2.5:0.5b",
          stream: false,
          prompt:
            "Você é Turing, agente do NexoTerraCore. Responda em português, de forma curta e objetiva, em no máximo quatro frases.\n\nPergunta: " +
            pergunta
        })
      });

      if (r.ok) {
        const data = await r.json();
        if (data?.response) {
          return resposta(data.response, "turing:ollama");
        }
      }
    } catch (_) {}
  }

  return null;
}

async function responderPerguntaPublica(perguntaOriginal) {
  const pergunta = String(perguntaOriginal || "").trim();

  if (!pergunta || pergunta.length > 500) {
    return resposta("Envie uma pergunta entre 1 e 500 caracteres.");
  }

  const calculo = tentarCalculo(pergunta);
  if (calculo) return calculo;

  const conhecimento = consultarConhecimentoInterno(pergunta);
  if (conhecimento) return conhecimento;

  const basico = conhecimentoPublicoBasico(pergunta);
  if (basico) return basico;

  const modelo = await consultarModelo(pergunta);
  if (modelo) return modelo;

  return resposta(
    "Ainda não tenho uma resposta pública confiável para essa pergunta. Tente reformular de maneira mais específica."
  );
}

module.exports = { responderPerguntaPublica };
