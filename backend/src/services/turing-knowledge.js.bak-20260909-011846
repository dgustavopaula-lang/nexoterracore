function resposta(texto, fonte = "turing:knowledge:nexoterracore:v1.2") {
  return {
    resposta: texto,
    fontes: [fonte],
    dados: null
  };
}

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function perguntaConceitual(pergunta) {
  return /\b(o que e|o que sao|defina|definicao|explique|como funciona|qual a diferenca|significa|quem e|para que serve|como usar|posso usar|tem app|tem aplicativo)\b/.test(pergunta);
}

function contem(pergunta, termos) {
  return termos.some((termo) => pergunta.includes(normalizar(termo)));
}

function consultarConhecimentoInterno(perguntaOriginal) {
  const pergunta = normalizar(perguntaOriginal);
  const conceitual = perguntaConceitual(pergunta);

  // Identidade e arquitetura principal
  if (contem(pergunta, ["quem e turing", "o que e turing", "o que e o turing", "turing", "agente turing", "chat turing"])) {
    return resposta(
      "Turing é o agente de inteligência artificial integrado ao NexoTerraCore. Ele interpreta perguntas, utiliza conhecimento interno, trabalha com dados disponíveis no contexto autorizado e pode apoiar análises, decisões e automações conforme os recursos disponíveis."
    );
  }

  if (contem(pergunta, ["o que e nexoterracore", "nexoterracore", "nexo terra core"])) {
    return resposta(
      "O NexoTerraCore é uma plataforma de integração, organização e gestão de dados operacionais. Seu núcleo conecta APIs, dados, usuários, organizações e módulos em uma arquitetura centralizada, com operação pelo Console e apoio do Turing."
    );
  }

  if (contem(pergunta, ["nexoterracore core", "core", "nucleo tecnico", "nucleo do nexoterracore"])) {
    return resposta(
      "O NexoTerraCore Core é o núcleo técnico da plataforma. Ele concentra API, autenticação, multitenancy, permissões, regras de negócio, acesso a dados e integração entre módulos."
    );
  }

  if (contem(pergunta, ["console", "sala de comando", "como funciona o console", "o que e o console"])) {
    return resposta(
      "O NexoTerraCore Console é a Sala de Comando da plataforma. É a interface privada usada para acessar módulos, dados, administração, API e o Turing dentro do contexto autorizado."
    );
  }

  if (contem(pergunta, ["control plane", "plano de controle"])) {
    return resposta(
      "Control Plane é a camada central de controle e organização do NexoTerraCore, responsável por coordenar recursos, integrações, acessos e serviços da plataforma."
    );
  }

  if (contem(pergunta, ["como funciona o nexoterracore", "fluxo do nexoterracore", "fluxo do sistema"])) {
    return resposta(
      "De forma simplificada, o fluxo do NexoTerraCore é: Dados → APIs → NexoTerraCore Core → Turing → Console → decisão e operação."
    );
  }

  // Tokens e créditos internos
  if (contem(pergunta, ["token de acesso", "bearer token", "token bearer", "token de autenticacao"])) {
    return resposta(
      "Bearer token é um token utilizado para autenticação e autorização de acesso à API ou ao sistema. Ele representa autorização de acesso e não possui função de crédito, pagamento ou investimento."
    );
  }

  if (contem(pergunta, ["ntcoin", "ntcoins", "creditos", "creditos do turing", "creditos de uso"])) {
    return resposta(
      "NTCoins são créditos digitais internos de utilidade do NexoTerraCore. Eles podem representar cotas de uso do Turing e de outros serviços. No modelo atual, não são criptomoeda pública, investimento, valor mobiliário ou ativo negociável."
    );
  }

  if (contem(pergunta, ["token de ia", "tokens de ia", "token de inteligencia artificial", "tokens do modelo"])) {
    return resposta(
      "Tokens de IA são unidades computacionais usadas pelos modelos para processar entradas e gerar respostas. Eles representam consumo computacional e são diferentes de Bearer tokens e NTCoins."
    );
  }

  if ((conceitual || pergunta === "token" || pergunta === "tokens") && /\btokens?\b/.test(pergunta)) {
    return resposta(
      "No NexoTerraCore, token pode significar conceitos diferentes: Bearer token para autenticação, NTCoins como créditos internos de uso e tokens de IA como unidades computacionais consumidas pelos modelos."
    );
  }

  // API e HTTP
  if (contem(pergunta, ["endpoint", "o que e endpoint"])) {
    return resposta(
      "Endpoint é um endereço específico de uma API usado para executar uma operação, como consultar, criar ou atualizar um recurso."
    );
  }

  if (contem(pergunta, ["o que e get", "metodo get", "get http"])) {
    return resposta("GET é um método HTTP usado principalmente para consultar ou obter informações de uma API sem alterar o recurso consultado.");
  }

  if (contem(pergunta, ["o que e post", "metodo post", "post http"])) {
    return resposta("POST é um método HTTP usado normalmente para criar ou enviar novos dados para uma API.");
  }

  if (contem(pergunta, ["o que e put", "metodo put", "put http"])) {
    return resposta("PUT é um método HTTP usado normalmente para substituir ou atualizar um recurso de forma completa.");
  }

  if (contem(pergunta, ["o que e patch", "metodo patch", "patch http"])) {
    return resposta("PATCH é um método HTTP usado normalmente para atualizar apenas parte de um recurso.");
  }

  if ((conceitual || pergunta === "api") && /\bapi\b/.test(pergunta)) {
    return resposta(
      "No NexoTerraCore, a API é a camada central de comunicação que recebe, organiza, protege e distribui dados e operações entre módulos, usuários, agentes e integrações."
    );
  }

  // Segurança, autenticação e multitenancy
  if (contem(pergunta, ["multitenancy", "multitenant", "tenant", "multiempresa"])) {
    return resposta(
      "Multitenancy é a arquitetura que permite ao NexoTerraCore atender múltiplas organizações no mesmo núcleo mantendo dados, sessões, permissões e contexto logicamente isolados. Cada tenant representa um ambiente organizacional separado."
    );
  }

  if (contem(pergunta, ["organizacao_id", "organizacao id"])) {
    return resposta(
      "organizacao_id é um identificador usado para relacionar dados a uma organização específica e apoiar o isolamento entre tenants no NexoTerraCore."
    );
  }

  if (conceitual && /\borganizacao\b/.test(pergunta)) {
    return resposta(
      "Organização é o nível principal de isolamento empresarial do NexoTerraCore. Usuários, fazendas, permissões e recursos operam dentro do contexto autorizado dessa organização."
    );
  }

  if (contem(pergunta, ["autenticacao", "o que e autenticacao"])) {
    return resposta("Autenticação é o processo de confirmar a identidade de um usuário ou aplicação antes de permitir acesso ao sistema.");
  }

  if (contem(pergunta, ["autorizacao", "o que e autorizacao"])) {
    return resposta("Autorização determina o que um usuário autenticado pode fazer e quais recursos pode acessar dentro do contexto permitido.");
  }

  if (contem(pergunta, ["rate limit", "limite de requisicoes", "limite da api"])) {
    return resposta("Rate limit é um mecanismo que limita a quantidade de requisições permitidas em determinado período para proteger a API contra excesso de uso ou abuso.");
  }

  if (contem(pergunta, ["ambiente autorizado", "contexto autorizado", "dados autorizados"])) {
    return resposta(
      "Ambiente autorizado é o conjunto de dados, módulos e operações que o usuário atual tem permissão para acessar conforme autenticação, organização, tenant, fazenda ativa e perfil."
    );
  }

  if (contem(pergunta, ["turing ve tudo", "turing acessa tudo", "turing acessa meus dados", "seguranca dos dados"])) {
    return resposta(
      "Não. O Turing deve trabalhar apenas com dados permitidos pelo contexto autenticado do usuário, organização, tenant, fazenda ou módulo correspondente."
    );
  }

  if (conceitual && /\bfazenda ativa\b/.test(pergunta)) {
    return resposta(
      "Fazenda ativa é a propriedade selecionada na sessão atual. As consultas operacionais do Turing respeitam o fazendaId dessa sessão."
    );
  }

  if (contem(pergunta, ["consulta controlada", "consulta_controlada"])) {
    return resposta(
      "Consulta controlada é o modo em que o Turing responde respeitando autenticação, permissões, organização, fazenda ativa e regras de segurança."
    );
  }

  // Infraestrutura e aplicativo
  if (contem(pergunta, ["postgresql", "postgres", "banco de dados"])) {
    return resposta("PostgreSQL é o banco de dados relacional utilizado pelo NexoTerraCore para armazenar e organizar dados estruturados da plataforma.");
  }

  if (contem(pergunta, ["pwa", "progressive web app", "tem aplicativo", "tem app", "funciona no celular", "usar no celular"])) {
    return resposta(
      "Sim. O NexoTerraCore Console possui interface responsiva e versão PWA para dispositivos compatíveis. O aplicativo pode ser instalado a partir do navegador quando essa opção estiver disponível, sem necessidade de APK ou loja de aplicativos."
    );
  }

  if (contem(pergunta, ["offline-first", "offline first", "edge", "modo offline"])) {
    return resposta(
      "Offline-first é a estratégia em que operações essenciais podem continuar localmente sem internet e sincronizar posteriormente quando a conexão retornar, conforme os recursos implementados."
    );
  }

  // Módulos e projetos
  if (contem(pergunta, ["quais sao os modulos", "modulos do sistema", "o que tem no sistema", "modulos"])) {
    return resposta(
      "O NexoTerraCore pode organizar módulos como Patrimônio, Imóveis, Clientes, Agro, Financeiro, Mapas, API / Control Plane, Turing e Administração."
    );
  }

  if (contem(pergunta, ["agrocore", "o agrocore e o nexoterracore", "diferenca agrocore nexoterracore"])) {
    return resposta(
      "AgroCore não é o NexoTerraCore. AgroCore é um projeto voltado ao contexto agrícola. O NexoTerraCore é o núcleo de infraestrutura, integração e inteligência que pode apoiar o AgroCore e outros sistemas."
    );
  }

  if (contem(pergunta, ["diferenca entre nexoterracore e turing", "nexoterracore e turing"])) {
    return resposta("O NexoTerraCore é a plataforma e infraestrutura. O Turing é o agente de inteligência integrado a essa plataforma.");
  }

  if (contem(pergunta, ["diferenca entre api e console", "api e console"])) {
    return resposta("A API é a camada técnica de troca estruturada de dados e serviços. O Console é a interface visual usada por pessoas para operar a plataforma.");
  }

  if (contem(pergunta, ["turing math engine"])) {
    return resposta(
      "Turing Math Engine é o módulo de matemática aplicada do NexoTerraCore para produtividade, custos, margens, cenários, ROI, payback e apoio à decisão."
    );
  }

  if (contem(pergunta, ["ntc-nexo", "nexo language", "ntc nexo language"])) {
    return resposta(
      "NTC-NEXO Language é a linguagem de domínio planejada para padronizar a comunicação entre Turing, Core, APIs, PostgreSQL, máquinas, sensores, fazendas e integrações."
    );
  }

  // Política de resposta do Turing
  if (contem(pergunta, ["turing inventa", "inventar resposta", "inventar dados"])) {
    return resposta(
      "Não. Quando não houver conhecimento interno ou dados autorizados suficientes, o Turing deve informar que não existem dados suficientes para responder com segurança."
    );
  }

  if (contem(pergunta, ["turing usa ia externa", "ia externa", "modelo externo"])) {
    return resposta(
      "O Turing pode utilizar diferentes camadas de inteligência. Perguntas cobertas pelo conhecimento interno do NexoTerraCore devem ser respondidas localmente primeiro. Outros modelos podem ser usados apenas quando necessários e permitidos pela arquitetura."
    );
  }

  if (contem(pergunta, ["como se apresenta", "se apresente", "apresente-se", "apresente se"])) {
    return resposta(
      "Sou o Turing, agente de inteligência do NexoTerraCore. Posso ajudar a entender a plataforma, seus módulos, APIs e dados disponíveis no seu contexto autorizado."
    );
  }

  return null;
}

module.exports = { consultarConhecimentoInterno };
