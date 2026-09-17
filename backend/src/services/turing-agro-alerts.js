function diasEntre(dataInicial, dataFinal) {
  const a = new Date(`${dataInicial}T00:00:00Z`);
  const b = new Date(`${dataFinal}T00:00:00Z`);
  return Math.floor((b - a) / 86400000);
}

function analisarFazenda(fazenda, dataReferencia) {
  const alertas = [];

  for (const insumo of fazenda.insumos || []) {
    if (
      insumo.status !== "recebido" &&
      insumo.dataPrevista &&
      insumo.dataPrevista < dataReferencia
    ) {
      const atrasoDias = diasEntre(insumo.dataPrevista, dataReferencia);

      alertas.push({
        nivel: atrasoDias >= 3 ? "CRÍTICO" : "ATENÇÃO",
        tipo: "INSUMO_ATRASADO",
        fazenda: fazenda.nome,
        item: insumo.nome,
        mensagem:
          `${insumo.nome}: entrega atrasada ${atrasoDias} dia(s).`
      });
    }
  }

  for (const estoque of fazenda.estoques || []) {
    const atual = Number(estoque.quantidadeAtual || 0);
    const minimo = Number(estoque.quantidadeMinima || 0);

    if (atual <= minimo) {
      alertas.push({
        nivel: "CRÍTICO",
        tipo: "ESTOQUE_CRITICO",
        fazenda: fazenda.nome,
        item: estoque.nome,
        mensagem:
          `${estoque.nome}: estoque ${atual} ${estoque.unidade || ""}, mínimo operacional ${minimo}.`
      });
    } else if (minimo > 0 && atual <= minimo * 1.2) {
      alertas.push({
        nivel: "ATENÇÃO",
        tipo: "ESTOQUE_BAIXO",
        fazenda: fazenda.nome,
        item: estoque.nome,
        mensagem:
          `${estoque.nome}: estoque próximo do mínimo operacional.`
      });
    }
  }

  for (const maquina of fazenda.maquinas || []) {
    if (
      ["Manutenção", "Inativa"].includes(maquina.status) &&
      maquina.previsaoRetorno &&
      maquina.previsaoRetorno < dataReferencia
    ) {
      const atrasoDias = diasEntre(maquina.previsaoRetorno, dataReferencia);

      alertas.push({
        nivel: "CRÍTICO",
        tipo: "MAQUINA_RETORNO_ATRASADO",
        fazenda: fazenda.nome,
        item: maquina.nome,
        mensagem:
          `${maquina.nome}: retorno operacional vencido há ${atrasoDias} dia(s).`
      });
    } else if (["Manutenção", "Inativa"].includes(maquina.status)) {
      alertas.push({
        nivel: "ATENÇÃO",
        tipo: "MAQUINA_INDISPONIVEL",
        fazenda: fazenda.nome,
        item: maquina.nome,
        mensagem:
          `${maquina.nome}: equipamento registrado como ${maquina.status}.`
      });
    }
  }

  return alertas;
}

function analisarOperacaoAgro(fazendas, dataReferencia) {
  const alertas = fazendas.flatMap(
    fazenda => analisarFazenda(fazenda, dataReferencia)
  );

  const ordem = {
    "CRÍTICO": 1,
    "ATENÇÃO": 2,
    "INFORMATIVO": 3
  };

  alertas.sort(
    (a, b) => (ordem[a.nivel] || 99) - (ordem[b.nivel] || 99)
  );

  return {
    fazendasAnalisadas: fazendas.length,
    totalAlertas: alertas.length,
    criticos: alertas.filter(a => a.nivel === "CRÍTICO").length,
    atencao: alertas.filter(a => a.nivel === "ATENÇÃO").length,
    alertas
  };
}

module.exports = {
  analisarFazenda,
  analisarOperacaoAgro
};
