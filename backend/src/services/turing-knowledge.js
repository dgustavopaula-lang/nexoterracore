function resposta(texto) {
  return {
    resposta: texto,
    fontes: ["turing:knowledge:nexoterracore:v1.1"],
    dados: null
  };
}

function perguntaConceitual(pergunta) {
  return /\b(o que e|o que sao|defina|definicao|explique|como funciona|qual a diferenca|significa)\b/.test(pergunta);
}

function consultarConhecimentoInterno(pergunta) {
  const conceitual = perguntaConceitual(pergunta);

  if (conceitual && /\b(bearer token|token bearer|token de autenticacao)\b/.test(pergunta)) {
    return resposta(
      "O Bearer token autentica uma sessão perante a API do NexoTerraCore. Ele representa autorização de acesso e não possui função de crédito ou pagamento."
    );
  }

  if (conceitual && /\b(ntcoins?|creditos? do turing|creditos? de uso)\b/.test(pergunta)) {
    return resposta(
      "NTCoins são créditos digitais internos de utilidade do NexoTerraCore. Eles podem representar cotas de uso do Turing e de outros serviços, separados do Bearer token de autenticação."
    );
  }

  if (conceitual && /\b(tokens? de ia|tokens? de inteligencia artificial|tokens? do modelo)\b/.test(pergunta)) {
    return resposta(
      "Tokens de IA são unidades computacionais usadas pelo modelo para processar entrada e gerar respostas. O NexoTerraCore pode medir esse consumo para calcular custos, cotas e uso de NTCoins."
    );
  }

  if (conceitual && /\btokens?\b/.test(pergunta)) {
    return resposta(
      "No NexoTerraCore, token pode significar conceitos diferentes: Bearer token para autenticação, NTCoins como créditos internos de uso e tokens de IA como unidades computacionais consumidas pelos modelos."
    );
  }

  if (conceitual && /\b(tenant|multitenant|multitenancy|multiempresa)\b/.test(pergunta)) {
    return resposta(
      "Multitenancy é a arquitetura que permite ao NexoTerraCore atender múltiplas organizações no mesmo núcleo mantendo dados, sessões, permissões e contexto isolados."
    );
  }

  if (conceitual && /\borganizacao\b/.test(pergunta)) {
    return resposta(
      "Organização é o nível principal de isolamento empresarial do NexoTerraCore. Usuários, fazendas, permissões e recursos operam dentro do contexto autorizado dessa organização."
    );
  }

  if (conceitual && /\bfazenda ativa\b/.test(pergunta)) {
    return resposta(
      "Fazenda ativa é a propriedade selecionada na sessão atual. As consultas operacionais do Turing respeitam o fazendaId dessa sessão."
    );
  }

  if (conceitual && /\bturing math engine\b/.test(pergunta)) {
    return resposta(
      "Turing Math Engine é o módulo de matemática aplicada do NexoTerraCore para produtividade, custos, margens, cenários, ROI, payback e apoio à decisão."
    );
  }

  if (conceitual && /\b(ntc-nexo|nexo language|ntc nexo language)\b/.test(pergunta)) {
    return resposta(
      "NTC-NEXO Language é a linguagem de domínio planejada para padronizar a comunicação entre Turing, Core, APIs, PostgreSQL, máquinas, sensores, fazendas e integrações."
    );
  }

  if (conceitual && /\b(offline-first|offline first|edge|modo offline)\b/.test(pergunta)) {
    return resposta(
      "Offline-first significa que operações essenciais do NexoTerraCore podem continuar localmente sem internet e sincronizar posteriormente quando a conexão retornar."
    );
  }

  if (conceitual && /\b(consulta controlada|consulta_controlada)\b/.test(pergunta)) {
    return resposta(
      "Consulta controlada é o modo em que o Turing responde respeitando autenticação, permissões, organização, fazenda ativa e regras de segurança."
    );
  }

  if (conceitual && /\bturing\b/.test(pergunta)) {
    return resposta(
      "Turing é o agente de inteligência artificial do NexoTerraCore. Ele interpreta perguntas, consulta recursos autorizados, usa conhecimento interno e pode recorrer à IA local quando necessário."
    );
  }

  if (conceitual && /\bnexoterracore\b/.test(pergunta)) {
    return resposta(
      "NexoTerraCore é o núcleo central de integração, gestão e inteligência que organiza APIs, dados, permissões, organizações, fazendas, ativos, módulos e agentes de IA."
    );
  }

  if (conceitual && /\bapi\b/.test(pergunta)) {
    return resposta(
      "No NexoTerraCore, a API é a camada central de comunicação que recebe, organiza, protege e distribui dados e operações entre módulos, usuários, agentes e integrações."
    );
  }

  return null;
}

module.exports = { consultarConhecimentoInterno };
