"use strict";

const {
  calcularCenariosLoteamento
} = require("./loteamento-cenarios");

function numeroPositivoOuNull(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function carregarProjetoLoteamento(
  pool,
  { codigoFazenda = "CAMPANHA-001" } = {}
) {
  const r = await pool.query(
    `
      SELECT
        f.id AS fazenda_id,
        f.organizacao_id,
        f.nome AS fazenda,
        i.id AS imovel_id,
        i.titulo,
        i.terreno_m2,
        i.matricula,
        i.cidade,
        i.uf,
        i.mapa,
        i.observacao,
        i.dados_extras
      FROM fazendas f
      JOIN imoveis i
        ON i.fazenda_id = f.id
       AND i.ativo = TRUE
      WHERE f.codigo = $1
        AND LOWER(i.titulo) =
            LOWER('Projeto Loteamento Campanha')
      LIMIT 1
    `,
    [codigoFazenda]
  );

  if (!r.rowCount) {
    throw new Error(
      "Projeto Loteamento Campanha não encontrado."
    );
  }

  const x = r.rows[0];
  const extras = x.dados_extras || {};

  return {
    fazendaId: Number(x.fazenda_id),
    organizacaoId: Number(x.organizacao_id),
    fazenda: x.fazenda,
    imovelId: Number(x.imovel_id),
    titulo: x.titulo,

    areaTotalM2: numeroPositivoOuNull(x.terreno_m2),

    areaConsideradaM2:
      numeroPositivoOuNull(extras.area_estudo_m2) ||
      numeroPositivoOuNull(extras.area_considerada_m2),

    matricula: x.matricula || null,
    cidade: x.cidade || null,
    uf: x.uf || null,
    mapa: x.mapa || null,
    observacao: x.observacao || null,
    dadosExtras: extras
  };
}

function diagnosticarProjeto(projeto) {
  const pendencias = [];

  if (!projeto.areaTotalM2) {
    pendencias.push({
      tipo: "AREA_TOTAL",
      nivel: "CRÍTICO",
      mensagem: "Área total não cadastrada."
    });
  }

  if (!projeto.areaConsideradaM2) {
    pendencias.push({
      tipo: "AREA_CONSIDERADA",
      nivel: "ATENÇÃO",
      mensagem:
        "Área útil/considerada para parcelamento ainda não foi definida."
    });
  }

  if (!projeto.matricula) {
    pendencias.push({
      tipo: "MATRICULA",
      nivel: "ATENÇÃO",
      mensagem: "Matrícula do imóvel ainda não informada."
    });
  }

  if (!projeto.mapa) {
    pendencias.push({
      tipo: "MAPA",
      nivel: "ATENÇÃO",
      mensagem: "Mapa/geometria do imóvel ainda não informado."
    });
  }

  const geoStatus =
    projeto.dadosExtras.geolocalizacao_status || null;

  if (!geoStatus || geoStatus === "pendente") {
    pendencias.push({
      tipo: "GEOLOCALIZACAO",
      nivel: "ATENÇÃO",
      mensagem: "Geolocalização ainda pendente."
    });
  }

  let simulacao = null;

  if (
    projeto.areaTotalM2 &&
    projeto.areaConsideradaM2
  ) {
    simulacao = calcularCenariosLoteamento({
      areaTotalM2: projeto.areaTotalM2,
      areaConsideradaM2: projeto.areaConsideradaM2
    });
  }

  return {
    projeto: projeto.titulo,
    fazenda: projeto.fazenda,
    localizacao:
      [projeto.cidade, projeto.uf]
        .filter(Boolean)
        .join(" / "),
    areaTotalM2: projeto.areaTotalM2,
    areaConsideradaM2: projeto.areaConsideradaM2,
    status:
      pendencias.some(p => p.nivel === "CRÍTICO")
        ? "CRÍTICO"
        : pendencias.length
          ? "ATENÇÃO"
          : "PRONTO",
    totalPendencias: pendencias.length,
    pendencias,
    simulacao,
    proximaAcao:
      !projeto.areaConsideradaM2
        ? "Definir a área considerada para estudo antes de gerar cenários oficiais."
        : "Cenários matemáticos disponíveis para análise."
  };
}

module.exports = {
  carregarProjetoLoteamento,
  diagnosticarProjeto
};
