const { analisarFazenda } = require("./turing-agro-alerts");

function dataISO(valor) {
  if (!valor) return null;

  if (typeof valor === "string") {
    return valor.slice(0, 10);
  }

  return new Date(valor).toISOString().slice(0, 10);
}

async function carregarFazendaOperacional(
  pool,
  { organizacaoId, fazendaId }
) {
  const fazendaResult = await pool.query(
    `
      SELECT id, organizacao_id, nome, codigo
      FROM fazendas
      WHERE id = $1
        AND organizacao_id = $2
        AND ativo = TRUE
      LIMIT 1
    `,
    [fazendaId, organizacaoId]
  );

  if (!fazendaResult.rowCount) {
    throw new Error("Fazenda não encontrada ou fora da organização.");
  }

  const [insumosResult, estoquesResult, maquinasResult] =
    await Promise.all([
      pool.query(
        `
          SELECT
            nome,
            status,
            data_prevista
          FROM agro_insumos
          WHERE fazenda_id = $1
            AND organizacao_id = $2
          ORDER BY id
        `,
        [fazendaId, organizacaoId]
      ),

      pool.query(
        `
          SELECT
            nome,
            unidade,
            quantidade_atual,
            quantidade_minima
          FROM agro_estoques
          WHERE fazenda_id = $1
            AND organizacao_id = $2
          ORDER BY id
        `,
        [fazendaId, organizacaoId]
      ),

      pool.query(
        `
          SELECT
            nome,
            status,
            previsao_retorno
          FROM maquinas
          WHERE fazenda_id = $1
          ORDER BY id
        `,
        [fazendaId]
      )
    ]);

  const fazenda = fazendaResult.rows[0];

  return {
    id: Number(fazenda.id),
    organizacaoId: Number(fazenda.organizacao_id),
    nome: fazenda.nome,
    codigo: fazenda.codigo,

    insumos: insumosResult.rows.map(item => ({
      nome: item.nome,
      status: item.status,
      dataPrevista: dataISO(item.data_prevista)
    })),

    estoques: estoquesResult.rows.map(item => ({
      nome: item.nome,
      unidade: item.unidade,
      quantidadeAtual: Number(item.quantidade_atual),
      quantidadeMinima: Number(item.quantidade_minima)
    })),

    maquinas: maquinasResult.rows.map(item => ({
      nome: item.nome,
      status: item.status,
      previsaoRetorno: dataISO(item.previsao_retorno)
    }))
  };
}

async function analisarFazendaDoBanco(
  pool,
  { organizacaoId, fazendaId, dataReferencia }
) {
  const fazenda = await carregarFazendaOperacional(
    pool,
    { organizacaoId, fazendaId }
  );

  const referencia =
    dataReferencia ||
    new Date().toISOString().slice(0, 10);

  const alertas = analisarFazenda(fazenda, referencia);

  return {
    fazendaId: fazenda.id,
    fazenda: fazenda.nome,
    dataReferencia: referencia,
    insumos: fazenda.insumos.length,
    estoques: fazenda.estoques.length,
    maquinas: fazenda.maquinas.length,
    totalAlertas: alertas.length,
    alertas
  };
}

module.exports = {
  carregarFazendaOperacional,
  analisarFazendaDoBanco
};
