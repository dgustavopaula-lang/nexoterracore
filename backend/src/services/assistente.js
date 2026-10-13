
const {
  consultarUF: consultarGaiaUF,
  selecionarCulturas: selecionarCulturasGaia
} = require("./ingestors/gaia-centro-oeste");

const {
  consultarConhecimentoReal,
  contextoTuring
} = require("./intelligence-knowledge");

const { responderTuringAngola } = require('./turing-angola-radar');
const { interpretarLoteamentoEconomico } = require("./turing-loteamento-economico");
const { calcularMatematica } = require("./turing-math");
const { temPermissao } = require("../security/permissions");
const { consultarConhecimentoInterno } = require("./turing-knowledge");
const { consultarConhecimentoGeral } = require("./turing-general-knowledge");
const { montarPromptTuringAgro } = require("./turing-agro-context");

const dinheiro = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

class ErroAssistente extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extrairPeriodo(pergunta) {
  const datas = pergunta.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];

  if (!datas.length) {
    return null;
  }

  if (datas.length !== 2) {
    throw new ErroAssistente(
      400,
      "Para consultar um período, informe a data inicial e a final no formato AAAA-MM-DD."
    );
  }

  const [inicio, fim] = datas;
  const dataReal = (valor) => {
    const data = new Date(`${valor}T00:00:00Z`);
    return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
  };

  if (!dataReal(inicio) || !dataReal(fim) || inicio > fim) {
    throw new ErroAssistente(400, "O período informado é inválido.");
  }

  return { inicio, fim };
}

function exigirPermissao(auth, recurso) {
  if (!temPermissao(auth.perfis, recurso, "GET")) {
    throw new ErroAssistente(403, "Sem permissão para consultar esses dados.");
  }
}

function detectarInstrucaoProibida(pergunta) {
  return /\b(ignore|ignorar|desconsidere|substitua).{0,40}\b(regra|instrucao|sistema)|\b(insert|update|delete|drop|alter|truncate|grant|revoke)\b|\b(outra|trocar|mudar)\s+fazenda\b|\b(system prompt|prompt do sistema)\b/.test(
    pergunta
  );
}

function descreverMaquina(maquina) {
  const partes = [maquina.nome];
  if (maquina.modelo) partes.push(`modelo ${maquina.modelo}`);
  partes.push(`status ${maquina.status}`);
  partes.push(`horímetro ${Number(maquina.horimetro)} h`);
  if (maquina.operacao) partes.push(`operação ${maquina.operacao}`);
  return partes.join(", ");
}

async function consultarMaquinas(pool, auth, tipo) {
  exigirPermissao(auth, "maquinas");

  if (tipo === "quantidade") {
    const resultado = await pool.query(
      "SELECT COUNT(*)::int AS total FROM maquinas WHERE fazenda_id = $1",
      [auth.fazendaId]
    );
    const total = resultado.rows[0].total;
    return {
      resposta: total
        ? `Esta fazenda possui ${total} máquina${total === 1 ? "" : "s"} cadastrada${total === 1 ? "" : "s"}.`
        : "Não existem máquinas cadastradas nesta fazenda.",
      fontes: ["maquinas"],
      dados: { total }
    };
  }

  const somenteNaoAtivas = tipo === "nao_ativas";
  const resultado = await pool.query(
    `
      SELECT id, nome, modelo, numero_serie, operacao, horimetro,
             proxima_revisao, combustivel, data_operacao, status
      FROM maquinas
      WHERE fazenda_id = $1
        AND ($2::BOOLEAN = FALSE OR status IN ('Inativa', 'Manutenção'))
      ORDER BY nome, id
      LIMIT 100
    `,
    [auth.fazendaId, somenteNaoAtivas]
  );

  if (!resultado.rowCount) {
    return {
      resposta: somenteNaoAtivas
        ? "Não existem máquinas com status Inativa ou Manutenção nesta fazenda. O sistema não possui telemetria para confirmar se uma máquina está fisicamente parada."
        : "Não existem máquinas cadastradas nesta fazenda.",
      fontes: ["maquinas"],
      dados: { maquinas: [] }
    };
  }

  const introducao = somenteNaoAtivas
    ? "Máquinas não ativas segundo o status cadastrado"
    : "Máquinas cadastradas";
  return {
    resposta: `${introducao}: ${resultado.rows.map(descreverMaquina).join("; ")}.`,
    fontes: ["maquinas"],
    dados: { maquinas: resultado.rows }
  };
}

async function consultarResumoFinanceiro(pool, auth, foco, periodo) {
  exigirPermissao(auth, "financeiro");
  const parametros = [auth.fazendaId];
  let filtroPeriodo = "";

  if (periodo) {
    parametros.push(periodo.inicio, periodo.fim);
    filtroPeriodo = "AND data_lancamento BETWEEN $2 AND $3";
  }

  const resultado = await pool.query(
    `
      SELECT
        COUNT(*)::int AS quantidade,
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'Receita'), 0) AS receitas,
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'Despesa'), 0) AS despesas,
        COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE -valor END), 0) AS saldo
      FROM lancamentos_financeiros
      WHERE fazenda_id = $1 ${filtroPeriodo}
    `,
    parametros
  );
  const linha = resultado.rows[0];
  const dados = {
    quantidade: linha.quantidade,
    receitas: Number(linha.receitas),
    despesas: Number(linha.despesas),
    saldo: Number(linha.saldo),
    periodo
  };

  if (!dados.quantidade) {
    return {
      resposta: periodo
        ? `Não existem lançamentos financeiros entre ${periodo.inicio} e ${periodo.fim} nesta fazenda.`
        : "Não existem lançamentos financeiros nesta fazenda.",
      fontes: ["lancamentos_financeiros"],
      dados
    };
  }

  const rotuloPeriodo = periodo
    ? ` entre ${periodo.inicio} e ${periodo.fim}`
    : "";
  const respostas = {
    receitas: `O total de receitas${rotuloPeriodo} é ${dinheiro.format(dados.receitas)}.`,
    despesas: `O total de despesas${rotuloPeriodo} é ${dinheiro.format(dados.despesas)}.`,
    saldo: `O saldo financeiro${rotuloPeriodo} é ${dinheiro.format(dados.saldo)}.`,
    resumo: `Resumo financeiro${rotuloPeriodo}: receitas de ${dinheiro.format(dados.receitas)}, despesas de ${dinheiro.format(dados.despesas)} e saldo de ${dinheiro.format(dados.saldo)}.`
  };
  return {
    resposta: respostas[foco],
    fontes: ["lancamentos_financeiros"],
    dados
  };
}

async function consultarUltimosLancamentos(pool, auth, periodo) {
  exigirPermissao(auth, "financeiro");
  const parametros = [auth.fazendaId];
  let filtroPeriodo = "";

  if (periodo) {
    parametros.push(periodo.inicio, periodo.fim);
    filtroPeriodo = "AND data_lancamento BETWEEN $2 AND $3";
  }

  const resultado = await pool.query(
    `
      SELECT id, descricao, categoria, valor, data_lancamento, tipo
      FROM lancamentos_financeiros
      WHERE fazenda_id = $1 ${filtroPeriodo}
      ORDER BY data_lancamento DESC, criado_em DESC
      LIMIT 10
    `,
    parametros
  );

  if (!resultado.rowCount) {
    return {
      resposta: periodo
        ? `Não existem lançamentos financeiros entre ${periodo.inicio} e ${periodo.fim} nesta fazenda.`
        : "Não existem lançamentos financeiros nesta fazenda.",
      fontes: ["lancamentos_financeiros"],
      dados: { lancamentos: [], periodo }
    };
  }

  const lista = resultado.rows.map(
    (item) =>
      `${String(item.data_lancamento).slice(0, 10)} — ${item.tipo}: ${item.descricao}, ${dinheiro.format(Number(item.valor))}`
  );
  return {
    resposta: `Últimos lançamentos: ${lista.join("; ")}.`,
    fontes: ["lancamentos_financeiros"],
    dados: { lancamentos: resultado.rows, periodo }
  };
}


async function consultarOllama(pergunta) {
  const url = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  const modelo = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";

  try {
    const resposta = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        stream: false,
        prompt: montarPromptTuringAgro(pergunta)
      })
    });

    if (!resposta.ok) {
      throw new Error(`Ollama HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    const texto = typeof dados.response === "string" ? dados.response.trim() : "";

    if (!texto) {
      throw new Error("Resposta vazia do Ollama");
    }

    return {
      resposta: texto,
      fontes: ["turing:nucleo-local"],
      dados: null
    };
  } catch (erro) {
    return {
      resposta: "Não existem dados suficientes ou uma consulta segura disponível para responder a essa pergunta.",
      fontes: [],
      dados: null
    };
  }
}


async function consultarTuringCentroOeste(pool, auth, perguntaOriginal) {
  const organizacaoId = Number(auth?.organizacaoId);

  if (!Number.isInteger(organizacaoId) || organizacaoId <= 0) {
    return {
      resposta: "Não foi possível identificar a organização ativa para consultar o radar Centro-Oeste.",
      fontes: [],
      dados: null
    };
  }

  const resultado = await pool.query(
    `
      SELECT
        empresa,
        municipio,
        estado,
        setor,
        tipo_evidencia,
        evidencia,
        fonte,
        decisor,
        contato,
        oportunidade,
        proxima_acao,
        prioridade,
        score,
        status
      FROM turing_centro_oeste_oportunidades
      WHERE organizacao_id = $1
      ORDER BY
        CASE prioridade
          WHEN 'ALTA' THEN 1
          WHEN 'MEDIA' THEN 2
          ELSE 3
        END,
        score DESC NULLS LAST,
        empresa
      LIMIT 20
    `,
    [organizacaoId]
  );

  if (!resultado.rowCount) {
    return {
      resposta: "Não existem oportunidades registradas no radar Centro-Oeste para a organização ativa.",
      fontes: ["Turing Centro-Oeste"],
      dados: {
        organizacao_id: organizacaoId,
        total: 0,
        oportunidades: []
      }
    };
  }

  const oportunidades = resultado.rows;

  const altas = oportunidades.filter(x => x.prioridade === "ALTA");
  const medias = oportunidades.filter(x => x.prioridade === "MEDIA");

  const principais = oportunidades.slice(0, 5).map((x, i) => {
    const local = [x.municipio, x.estado].filter(Boolean).join("/");
    const evidencia = x.tipo_evidencia
      ? x.tipo_evidencia.replaceAll("_", " ")
      : "SEM CLASSIFICAÇÃO";

    return `${i + 1}. ${x.empresa}` +
      `${local ? ` (${local})` : ""}` +
      ` — prioridade ${x.prioridade || "não definida"}, ` +
      `score ${x.score ?? "n/d"}, ${evidencia}.` +
      `${x.oportunidade ? ` Oportunidade: ${x.oportunidade}` : ""}` +
      `${x.proxima_acao ? ` Próxima ação: ${x.proxima_acao}` : ""}`;
  });

  return {
    resposta:
      `O radar Centro-Oeste possui ${oportunidades.length} oportunidades para a organização ativa: ` +
      `${altas.length} de prioridade alta e ${medias.length} de prioridade média.\n\n` +
      principais.join("\n\n") +
      `\n\nFatos, sinais de mercado e hipóteses comerciais são mantidos separados; hipótese não deve ser tratada como fato confirmado.`,
    fontes: [...new Set(
      oportunidades
        .map(x => x.fonte)
        .filter(Boolean)
    )],
    dados: {
      organizacao_id: organizacaoId,
      total: oportunidades.length,
      alta: altas.length,
      media: medias.length,
      oportunidades
    }
  };
}


async function consultarGaiaDinamica(perguntaOriginal) {
  const pergunta = normalizar(perguntaOriginal);

  const mapaUF = [
    { sigla: "GO", re: /\b(goias|goiás|\bgo\b)/ },
    { sigla: "MT", re: /\b(mato grosso|\bmt\b)/ },
    { sigla: "MS", re: /\b(mato grosso do sul|\bms\b)/ },
    { sigla: "DF", re: /\b(distrito federal|brasilia|brasília|\bdf\b)/ }
  ];

  const ufs = mapaUF
    .filter(x => x.re.test(pergunta))
    .map(x => x.sigla);

  const mencionaCentroOeste =
    /\bcentro[\s-]?oeste\b/.test(pergunta);

  const mencionaSoja = /\bsoja\b/.test(pergunta);
  const mencionaMilho = /\bmilho\b/.test(pergunta);

  const consultaAgro =
    mencionaSoja ||
    mencionaMilho ||
    /\b(area plantada|área plantada|area colhida|área colhida|producao|produção|rendimento)\b/.test(pergunta);

  if ((!ufs.length && !mencionaCentroOeste) || !consultaAgro) {
    return null;
  }

  const alvos = ufs.length
    ? ufs
    : ["GO", "MT", "MS", "DF"];

  const culturas = [];

  if (mencionaSoja) culturas.push("Soja");
  if (mencionaMilho) culturas.push("Milho");

  if (!culturas.length)
    culturas.push("Soja", "Milho");

  const resultados = [];

  for (const uf of alvos) {
    const registros = await consultarGaiaUF(uf);

    const selecionados =
      selecionarCulturasGaia(registros, culturas)
        .filter(x => x.valor !== null);

    resultados.push(...selecionados);
  }

  if (!resultados.length) {
    return {
      resposta:
        "Gaia consultou o IBGE/SIDRA, mas não encontrou dados compatíveis com a consulta.",
      fontes: ["IBGE/SIDRA - PAM tabela 5457"],
      dados: {
        agente: "gaia",
        coordenador: "turing",
        status: "SEM_RESULTADO",
        simulation: false
      }
    };
  }

  /*
   * Para perguntas sobre área plantada, priorizamos a variável
   * absoluta em hectares, evitando misturar percentual e área.
   */
  let relevantes = resultados;

  if (/area plantada|área plantada/.test(pergunta)) {
    relevantes = resultados.filter(x =>
      x.variavel.nome ===
        "Área plantada ou destinada à colheita" &&
      x.unidade.nome === "Hectares"
    );
  }

  if (/area colhida|área colhida/.test(pergunta)) {
    relevantes = resultados.filter(x =>
      x.variavel.nome === "Área colhida" &&
      x.unidade.nome === "Hectares"
    );
  }

  if (!relevantes.length)
    relevantes = resultados.slice(0, 20);

  const resumo = relevantes
    .slice(0, 20)
    .map(x =>
      `${x.territorio.uf}: ${x.produto.nome} — ` +
      `${x.variavel.nome}: ` +
      `${Number(x.valor).toLocaleString("pt-BR")} ${x.unidade.nome} ` +
      `(${x.periodo})`
    );

  return {
    resposta:
      "Gaia consultou dados reais do IBGE/SIDRA sob coordenação do Turing.\n" +
      resumo.join("\n"),
    fontes: ["IBGE/SIDRA - PAM tabela 5457"],
    dados: {
      agente: "gaia",
      coordenador: "turing",
      status: "REAL",
      simulation: false,
      total: relevantes.length,
      registros: relevantes.slice(0, 50)
    }
  };
}

async function responderPergunta(pool, auth, perguntaOriginal) {
  const pergunta = normalizar(perguntaOriginal);

  // ==================================================
  // TURING | KNOWLEDGE ROUTER V1
  // Turing = chefe
  // Guga   = Angola / Malanje / Cacuso
  // Gaia   = Brasil / Centro-Oeste
  // ==================================================

  const contextoCentral = contextoTuring();

  const rotaGuga =
    /\b(angola|malanje|cacuso)\b/.test(pergunta);

  if (rotaGuga) {
    const fatosGuga = consultarConhecimentoReal({
      agente: "guga"
    });

    if (fatosGuga.length > 0) {
      const fato = fatosGuga[0];

      return {
        resposta:
          `Segundo a fonte validada ${fato.fonte}, ` +
          `${fato.territorio} possui ${Number(fato.valor).toLocaleString("pt-BR")} ` +
          `${fato.unidade}, com referência em ${fato.data_referencia}.`,
        fontes: [fato.fonte],
        dados: {
          agente: "guga",
          coordenador: "turing",
          politica: contextoCentral.politica,
          fatos: fatosGuga
        }
      };
    }
  }

  const rotaGaia =
    /\b(centro[\s-]?oeste|goias|goiás|mato grosso|mato grosso do sul|distrito federal)\b/.test(pergunta);

  if (rotaGaia) {
    const fatosGaia = consultarConhecimentoReal({
      agente: "gaia"
    });

    if (fatosGaia.length > 0) {
      return {
        resposta: "Gaia encontrou dados reais validados para esta consulta.",
        fontes: [...new Set(fatosGaia.map(x => x.fonte).filter(Boolean))],
        dados: {
          agente: "gaia",
          coordenador: "turing",
          politica: contextoCentral.politica,
          fatos: fatosGaia
        }
      };
    }
  }

  // [TURING ANGOLA HOOK] Compatibilidade legada Interceptador de Inteligência Especializada Angola / Fazenda PIPE
  try {
    const _turingAngolaRes = await responderTuringAngola(typeof pool !== "undefined" ? pool : (arguments[0]?.pool || global.pool), typeof auth !== "undefined" ? auth : (arguments[1] || {}), typeof pergunta !== "undefined" ? pergunta : arguments[0]);
    if (_turingAngolaRes) return _turingAngolaRes;
  } catch (_errAngola) {
    console.error("[TuringAngolaHook] Erro silencioso:", _errAngola.message);
  }

  // [TURING -> GAIA DINÂMICA]
  try {
    const respostaGaia =
      await consultarGaiaDinamica(perguntaOriginal);

    if (respostaGaia)
      return respostaGaia;
  } catch (erroGaia) {
    console.error(
      "[TuringGaiaDinamica]",
      erroGaia.message
    );
    // Falha da fonte externa não derruba o Turing.
    // Continua para os mecanismos existentes.
  }

  // [TURING CENTRO-OESTE HOOK] Compatibilidade legada
  const perguntaCentroOeste =
    /\bcentro[\s-]?oeste\b/.test(pergunta) &&
    /\b(oportunidade|oportunidades|comercial|comerciais|radar|empresa|empresas|mercado|prioridade|prioritarias|prioritários)\b/.test(pergunta);

  if (perguntaCentroOeste) {
    try {
      return await consultarTuringCentroOeste(
        pool,
        auth,
        perguntaOriginal
      );
    } catch (erroCentroOeste) {
      console.error(
        "[TuringCentroOesteHook]",
        erroCentroOeste.message
      );

      return {
        resposta: "Não foi possível consultar o radar Centro-Oeste neste momento.",
        fontes: [],
        dados: null
      };
    }
  }


  if (detectarInstrucaoProibida(pergunta)) {
    return {
      resposta: "Não posso alterar regras, identidade, fazenda, permissões ou executar comandos. O Assistente funciona somente para consultas autorizadas da fazenda ativa.",
      fontes: [],
      dados: null
    };
  }

  const periodo = extrairPeriodo(pergunta);

  // Loteamentos têm prioridade sobre regras financeiras genéricas.
  const pareceLoteamento =
    /\blotes?\b|\bvgv\b/.test(pergunta);

  if (pareceLoteamento) {
    const economiaLoteamento =
      interpretarLoteamentoEconomico(perguntaOriginal);

    if (economiaLoteamento) {
      return economiaLoteamento;
    }
  }

  if (/\b(custo|gasto|despesa)s?\b.*\bmanutencao\b|\bmanutencao\b.*\b(custo|gasto|despesa)s?\b/.test(pergunta)) {
    return {
      resposta: "Não existem dados suficientes para relacionar custos de manutenção a uma máquina. Os lançamentos financeiros atuais não possuem vínculo com máquinas.",
      fontes: [],
      dados: null
    };
  }

  if (/\b(quantas?|numero|total)\b.*\bmaquinas?\b|\bmaquinas?\b.*\b(quantas?|numero)\b/.test(pergunta)) {
    return consultarMaquinas(pool, auth, "quantidade");
  }
  if (/\bmaquinas?\b.*\b(paradas?|inativas?|manutencao)\b|\b(paradas?|inativas?)\b.*\bmaquinas?\b/.test(pergunta)) {
    return consultarMaquinas(pool, auth, "nao_ativas");
  }
  if (/\b(mostrar?|listar?|quais?|dados?)\b.*\bmaquinas?\b|\bmaquinas? cadastradas?\b/.test(pergunta)) {
    return consultarMaquinas(pool, auth, "lista");
  }
  if (/\b(ultimos?|recentes?)\b.*\b(lancamentos?|movimentacoes?)\b/.test(pergunta)) {
    return consultarUltimosLancamentos(pool, auth, periodo);
  }
  if (/\b(receitas?|faturamento)\b/.test(pergunta)) {
    return consultarResumoFinanceiro(pool, auth, "receitas", periodo);
  }
  if (/\b(despesas?|gastos?|custos?)\b/.test(pergunta)) {
    return consultarResumoFinanceiro(pool, auth, "despesas", periodo);
  }
  if (/\b(saldo|resultado financeiro)\b/.test(pergunta)) {
    return consultarResumoFinanceiro(pool, auth, "saldo", periodo);
  }
  if (/\b(resumo|situacao)\b.*\bfinanceir[oa]\b/.test(pergunta)) {
    return consultarResumoFinanceiro(pool, auth, "resumo", periodo);
  }

  const matematica = calcularMatematica(perguntaOriginal);

  if (matematica) {
    return matematica;
  }

  const conhecimentoInterno = consultarConhecimentoInterno(pergunta);

  if (conhecimentoInterno) {
    return conhecimentoInterno;
  }

  const conhecimentoGeral = consultarConhecimentoGeral(pergunta);

  if (conhecimentoGeral) {
    return conhecimentoGeral;
  }

  return consultarOllama(perguntaOriginal);
}

module.exports = { ErroAssistente, responderPergunta };
