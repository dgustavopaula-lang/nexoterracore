const { temPermissao } = require("../security/permissions");

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

async function responderPergunta(pool, auth, perguntaOriginal) {
  const pergunta = normalizar(perguntaOriginal);

  if (detectarInstrucaoProibida(pergunta)) {
    return {
      resposta: "Não posso alterar regras, identidade, fazenda, permissões ou executar comandos. O Assistente funciona somente para consultas autorizadas da fazenda ativa.",
      fontes: [],
      dados: null
    };
  }

  const periodo = extrairPeriodo(pergunta);

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

  return {
    resposta: "Não existem dados suficientes ou uma consulta segura disponível para responder a essa pergunta. Nesta versão, posso consultar máquinas, status cadastrados, receitas, despesas, saldo e últimos lançamentos da fazenda ativa.",
    fontes: [],
    dados: null
  };
}

module.exports = { ErroAssistente, responderPergunta };
