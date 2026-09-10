const { temPermissao } = require("./permissions");

const CAPACIDADES = Object.freeze({
  "loteamento.economico": Object.freeze({
    versao: "1.0.0",
    recurso: null,
    metodo: "GET",
    publico: false,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "baixo"
  }),
  matematica: Object.freeze({
    versao: "1.0.0",
    recurso: null,
    metodo: "GET",
    publico: true,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "baixo"
  }),
  "maquinas.consulta": Object.freeze({
    versao: "1.0.0",
    recurso: "maquinas",
    metodo: "GET",
    publico: false,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "baixo"
  }),
  "financeiro.consulta": Object.freeze({
    versao: "1.0.0",
    recurso: "financeiro",
    metodo: "GET",
    publico: false,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "medio"
  }),
  "conhecimento.interno": Object.freeze({
    versao: "1.0.0",
    recurso: null,
    metodo: "GET",
    publico: true,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "baixo"
  }),
  "conhecimento.geral": Object.freeze({
    versao: "1.0.0",
    recurso: null,
    metodo: "GET",
    publico: true,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "baixo"
  }),
  "indicadores.bcb": Object.freeze({
    versao: "1.0.0",
    recurso: null,
    metodo: "GET",
    publico: true,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "baixo"
  }),
  "modelo.generativo": Object.freeze({
    versao: "1.0.0",
    recurso: null,
    metodo: "GET",
    publico: true,
    somenteLeitura: true,
    podeAlterarDados: false,
    exigeConfirmacao: false,
    nivelRisco: "medio"
  })
});

function obterCapacidade(nome) {
  return CAPACIDADES[nome] || null;
}

function validarCapacidade(nome, auth = null, { publico = false } = {}) {
  const capacidade = obterCapacidade(nome);

  if (!capacidade) {
    return {
      ok: false,
      status: 403,
      mensagem: "Capacidade não registrada para o Turing."
    };
  }

  if (publico && !capacidade.publico) {
    return {
      ok: false,
      status: 403,
      mensagem: "Capacidade não autorizada no Turing público."
    };
  }

  if (capacidade.podeAlterarDados) {
    return {
      ok: false,
      status: 403,
      mensagem: "Capacidades que alteram dados exigem fluxo explícito de confirmação."
    };
  }

  if (capacidade.recurso) {
    if (!auth?.perfis || !temPermissao(auth.perfis, capacidade.recurso, capacidade.metodo)) {
      return {
        ok: false,
        status: 403,
        mensagem: "Sem permissão para executar esta capacidade."
      };
    }
  }

  return { ok: true, capacidade };
}

function anexarGovernanca(resultado, nome) {
  if (!resultado || typeof resultado !== "object") {
    return resultado;
  }

  const capacidade = obterCapacidade(nome);
  if (!capacidade) return resultado;

  return {
    ...resultado,
    governanca: {
      capacidade: nome,
      versao: capacidade.versao,
      nivelRisco: capacidade.nivelRisco,
      somenteLeitura: capacidade.somenteLeitura,
      exigeConfirmacao: capacidade.exigeConfirmacao
    }
  };
}

module.exports = {
  CAPACIDADES,
  obterCapacidade,
  validarCapacidade,
  anexarGovernanca
};
