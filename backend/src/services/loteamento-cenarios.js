"use strict";

function numeroOpcional(valor, nome) {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`${nome} deve ser um número não negativo.`);
  }

  return numero;
}

function calcularCenariosLoteamento(entrada = {}) {
  const areaTotalM2 = Number(entrada.areaTotalM2);

  if (!Number.isFinite(areaTotalM2) || areaTotalM2 <= 0) {
    throw new Error("Informe uma área total válida.");
  }

  const areaConsideradaM2 =
    entrada.areaConsideradaM2 == null ||
    entrada.areaConsideradaM2 === ""
      ? areaTotalM2
      : Number(entrada.areaConsideradaM2);

  if (
    !Number.isFinite(areaConsideradaM2) ||
    areaConsideradaM2 <= 0 ||
    areaConsideradaM2 > areaTotalM2
  ) {
    throw new Error(
      "Área considerada deve ser maior que zero e não pode ultrapassar a área total."
    );
  }

  const tamanhosLoteM2 =
    Array.isArray(entrada.tamanhosLoteM2) &&
    entrada.tamanhosLoteM2.length
      ? entrada.tamanhosLoteM2.map(Number)
      : [200, 250, 300, 500, 1000];

  if (
    tamanhosLoteM2.some(
      valor => !Number.isFinite(valor) || valor <= 0
    )
  ) {
    throw new Error("Tamanhos de lote inválidos.");
  }

  const precoPorLote =
    numeroOpcional(entrada.precoPorLote, "Preço por lote");

  const precoPorM2 =
    numeroOpcional(entrada.precoPorM2, "Preço por m²");

  const custoTotal =
    numeroOpcional(entrada.custoTotal, "Custo total");

  const participacaoPercentual =
    numeroOpcional(
      entrada.participacaoPercentual,
      "Participação do proprietário"
    );

  if (
    participacaoPercentual !== null &&
    participacaoPercentual > 100
  ) {
    throw new Error(
      "Participação percentual não pode ultrapassar 100%."
    );
  }

  const participacaoTipo =
    ["vgv", "lucro", "lotes"].includes(entrada.participacaoTipo)
      ? entrada.participacaoTipo
      : "vgv";

  const cenarios = tamanhosLoteM2.map(tamanhoLoteM2 => {
    const quantidadeLotes =
      Math.floor(areaConsideradaM2 / tamanhoLoteM2);

    const areaUtilizadaM2 =
      quantidadeLotes * tamanhoLoteM2;

    const sobraM2 =
      areaConsideradaM2 - areaUtilizadaM2;

    const precoCalculadoPorLote =
      precoPorM2 !== null
        ? tamanhoLoteM2 * precoPorM2
        : precoPorLote;

    const vgv =
      precoCalculadoPorLote !== null
        ? quantidadeLotes * precoCalculadoPorLote
        : null;

    const lucroEstimado =
      vgv !== null && custoTotal !== null
        ? vgv - custoTotal
        : null;

    const margemLucroPercentual =
      lucroEstimado !== null && vgv > 0
        ? (lucroEstimado / vgv) * 100
        : null;

    let participacaoProprietario = null;
    let lotesProprietario = null;

    if (participacaoPercentual !== null) {
      const fator = participacaoPercentual / 100;

      if (participacaoTipo === "vgv" && vgv !== null) {
        participacaoProprietario = vgv * fator;
      }

      if (
        participacaoTipo === "lucro" &&
        lucroEstimado !== null
      ) {
        participacaoProprietario =
          lucroEstimado * fator;
      }

      if (participacaoTipo === "lotes") {
        lotesProprietario =
          quantidadeLotes * fator;

        if (precoCalculadoPorLote !== null) {
          participacaoProprietario =
            lotesProprietario * precoCalculadoPorLote;
        }
      }
    }

    return {
      tamanhoLoteM2,
      quantidadeLotes,
      areaUtilizadaM2,
      sobraM2,
      precoPorM2,

      precoPorLote: precoCalculadoPorLote,

      criterioPreco: precoPorM2 !== null ? "m2" : "lote",
      vgv,
      custoTotal,
      lucroEstimado,
      margemLucroPercentual,
      participacaoTipo,
      participacaoPercentual,
      lotesProprietario,
      participacaoProprietario
    };
  });

  return {
    areaTotalM2,
    areaConsideradaM2,
    cenarios,
    natureza: "Estimativas técnicas editáveis",
    observacoes: [
      "Quantidade final depende do projeto urbanístico aprovado.",
      "Valores econômicos são calculados somente quando informados.",
      "Percentual de permuta é parâmetro contratual editável.",
      "Valor potencial permanece separado do patrimônio realizado."
    ]
  };
}

module.exports = {
  calcularCenariosLoteamento
};
