const fs = require("fs");
const path = require("path");

const TERRITORIO = path.join(
  __dirname,
  "../../data/turing/regioes/brasil-centro-oeste-goias.json"
);

const CAMADA1 = path.join(
  __dirname,
  "../../data/turing/regioes/brasil-centro-oeste-camada1.json"
);

const OPORTUNIDADES = path.join(
  __dirname,
  "../../data/turing/oportunidades/brasil-centro-oeste-oportunidades.json"
);

const MACROEIXO = path.join(
  __dirname,
  "../../data/turing/regioes/brasil-macroeixo-agro-centro-brasil.json"
);

function carregarJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

function normalizar(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}


function extrairOrganizacaoIdBrasil(auth = {}) {
  return Number(
    auth.organizacao_id ??
    auth.organizacaoId ??
    auth.organizacao?.id ??
    auth.tenant_id ??
    auth.tenantId ??
    0
  );
}

function perguntaBrasil(pergunta) {
  const p = normalizar(pergunta);

  // MACROEIXO_GATEWAY_V2
  const termosMacroeixo = [
    "macroeixo",
    "centro-brasil",
    "corredor agro",
    "tocantins",
    "triangulo mineiro",
    "uberlandia",
    "br-364",
    "br364",
    "br-365",
    "br365",
    "br-050",
    "br050",
    "ferrovia norte-sul",
    "armazenagem regional",
    "frete",
    "escoamento",
    "conectividade rural",
    "pos-colheita",
    "mao de obra",
    "capacitacao",
    "credito rural"
  ];

  if (
    termosMacroeixo.some(
      (termo) => p.includes(termo)
    )
  ) {
    return true;
  }


  const termos = [
    "paranagel",
    "centro-oeste",
    "goias",
    "agro digital",
    "oportunidade agro",
    "oportunidades agro",
    "comissao agro",
    "rio verde",
    "jatai",
    "quirinopolis",
    "paranaiguara",
    "sao simao",
    "caramuru",
    "comigo",
    "armazenagem",
    "br-364",
    "br364"
  ];

  return termos.some((t) => p.includes(t));
}

async function responderTuringBrasil(pool, auth, perguntaOriginal) {
  if (!perguntaBrasil(perguntaOriginal)) {
    return null;
  }

  const p = normalizar(perguntaOriginal);

  const TURING_BRASIL_ORG_AUTORIZADA = 1;
  const organizacaoId = extrairOrganizacaoIdBrasil(auth);

  const perguntaPrivada =
    p.includes("paranagel") ||
    p.includes("comissao") ||
    p.includes("ganhar dinheiro") ||
    p.includes("monetizacao") ||
    p.includes("comprador") ||
    p.includes("prospect");

  if (
    perguntaPrivada &&
    organizacaoId !== TURING_BRASIL_ORG_AUTORIZADA
  ) {
    return {
      resposta:
        "Este conteúdo comercial pertence a um contexto privado do Turing Brasil e não está disponível para esta organização.",
      fontes: [],
      dados: {},
      contexto: {
        pais: "Brasil",
        agente: "Turing Brasil",
        acesso: "negado_por_tenant"
      }
    };
  }

  const territorio = carregarJson(TERRITORIO);
  const camada = carregarJson(CAMADA1);
  const radarOportunidades = carregarJson(OPORTUNIDADES);
  const macroeixo = carregarJson(MACROEIXO);

  const rede = camada.rede_logistica_comercial || {};
  const paranagel = rede.paranagel || {};
  const operadores = rede.operadores_estrategicos || [];
  const monetizacao = rede.motor_de_monetizacao || {};

  if (p.includes("paranagel")) {
    return {
      resposta:
        "A Paranagel está registrada no Turing Brasil como ativo privado de armazenagem/agroindústria em Paranaiguara, Goiás, conectado ao corredor da BR-364. O Turing deve analisá-la em conjunto com produção, armazenagem, logística e mercado regional. Caramuru e COMIGO aparecem como operadores ou prospects estratégicos a qualificar, não como compradores confirmados.",
      fontes: [
        "Turing Brasil — baseline agroterritorial",
        "Rede logística e comercial — Paranagel"
      ],
      dados: {
        paranagel,
        operadores,
        regra:
          "Não tratar prospect como comprador confirmado e não presumir comissão sem acordo."
      },
      contexto: {
        pais: "Brasil",
        regiao: "Centro-Oeste",
        estado_prioritario: "Goiás",
        dominio: "agro_logistica_comercial",
        agente: "Turing Brasil"
      }
    };
  }

  /*
   * INTENT_MACROEIXO_BRASIL
   *
   * Prioridade maior que a rota genérica de oportunidades.
   */

  const intentMacroeixo =
    p.includes("macroeixo") ||
    p.includes("eixo goias") ||
    p.includes("corredor agro") ||
    (
      p.includes("goias") &&
      (
        p.includes("tocantins") ||
        p.includes("triangulo mineiro") ||
        p.includes("uberlandia")
      )
    );

  if (intentMacroeixo) {

    // MACROEIXO_SUBINTENT_V2
    let subintent = "MACROEIXO_GERAL";

    if (p.includes("paranagel")) {
      subintent = "MACROEIXO_PARANAGEL";

    } else if (
      p.includes("armazen") ||
      p.includes("silo")
    ) {
      subintent = "MACROEIXO_ARMAZENAGEM";

    } else if (
      p.includes("frete") ||
      p.includes("escoamento") ||
      p.includes("logistica") ||
      p.includes("rodovia") ||
      p.includes("ferrovia") ||
      p.includes("br-364") ||
      p.includes("br364") ||
      p.includes("br-365") ||
      p.includes("br365") ||
      p.includes("br-050") ||
      p.includes("br050")
    ) {
      subintent = "MACROEIXO_LOGISTICA";

    } else if (
      p.includes("conectiv") ||
      p.includes("internet") ||
      p.includes("4g") ||
      p.includes("digitalizacao")
    ) {
      subintent = "MACROEIXO_CONECTIVIDADE";

    } else if (
      p.includes("pos-colheita") ||
      p.includes("secagem") ||
      p.includes("perdas") ||
      p.includes("qualidade")
    ) {
      subintent = "MACROEIXO_POS_COLHEITA";

    } else if (
      p.includes("mao de obra") ||
      p.includes("capacitacao") ||
      p.includes("treinamento") ||
      p.includes("qualificacao")
    ) {
      subintent = "MACROEIXO_MAO_DE_OBRA";

    } else if (
      p.includes("credito") ||
      p.includes("financiamento") ||
      p.includes("custeio")
    ) {
      subintent = "MACROEIXO_CREDITO";

    } else if (
      p.includes("gestao") ||
      p.includes("custos") ||
      p.includes("financeiro") ||
      p.includes("comercializacao")
    ) {
      subintent = "MACROEIXO_GESTAO";

    } else if (
      p.includes("oportunidade") ||
      p.includes("comissao") ||
      p.includes("parceria") ||
      p.includes("produto")
    ) {
      subintent = "MACROEIXO_OPORTUNIDADES";
    }

    const dores = macroeixo.dores_para_mapear || [];

    const documentadas = dores.filter((d) =>
      String(d.status || "").startsWith("EVIDENCIA")
    );

    const hipoteses = dores.filter((d) =>
      String(d.status || "").includes("HIPOTESE")
    );

    const aMapear = dores.filter((d) =>
      String(d.status || "") === "A_MAPEAR"
    );

    const oportunidades =
      radarOportunidades.oportunidades || [];

    const pedeOportunidades =
      p.includes("oportunidade") ||
      p.includes("comissao") ||
      p.includes("parceria") ||
      p.includes("produto");

    return {
      resposta:
        `O Macroeixo Agro Centro-Brasil está estruturado com Goiás como núcleo e Tocantins e Triângulo Mineiro como corredores estratégicos adjacentes. ` +
        `Hoje existem ${documentadas.length} dores com evidência regional inicial, ${hipoteses.length} hipótese(s) explícita(s) e ${aMapear.length} temas ainda a mapear. ` +
        `Os corredores registrados incluem BR-364/365, BR-050 e Ferrovia Norte-Sul. ` +
        (
          pedeOportunidades
            ? `O radar comercial possui ${oportunidades.length} oportunidades que podem ser cruzadas com essas dores, mas uma oportunidade só deve ser apresentada como solução quando houver aderência entre problema, empresa, fonte e modelo comercial.`
            : `O próximo passo é aprofundar cada dor sem transformar hipótese em fato.`
        ),

      fontes: [
        "Turing Brasil — Macroeixo Agro Centro-Brasil",
        ...(pedeOportunidades
          ? ["Turing Opportunities — Centro-Oeste"]
          : [])
      ],

      dados: {
        macroeixo: macroeixo.id,
        corredores:
          macroeixo.corredores_validados || [],
        nos_prioritarios:
          macroeixo.nos_prioritarios || [],
        dores_documentadas: documentadas,
        hipoteses,
        dores_a_mapear: aMapear,
        oportunidades:
          pedeOportunidades
            ? oportunidades
            : []
      },

      contexto: {
        pais: "Brasil",
        regiao_nucleo: "Centro-Oeste",
        estado_prioritario: "Goiás",
        corredores_adjacentes: [
          "Tocantins",
          "Triângulo Mineiro"
        ],
        agente: "Turing Brasil",
        dominio: "macroeixo_agro",
        intent: "MACROEIXO_BRASIL"
      }
    };
  }

  if (
    p.includes("oportunidade") ||
    p.includes("comissao") ||
    p.includes("ganhar dinheiro") ||
    p.includes("monetizacao") ||
    p.includes("parceria")
  ) {
    const oportunidades =
      radarOportunidades.oportunidades || [];

    const statusMonetizacaoComprovada = new Set([
      "COMISSAO_PUBLICA_VALIDADA",
      "BONUS_DINHEIRO_PUBLICO_VALIDADO"
    ]);

    const monetizacaoComprovada =
      oportunidades.filter((o) =>
        statusMonetizacaoComprovada.has(
          String(o.status || "")
        )
      );

    const parceriasAQualificar =
      oportunidades.filter((o) =>
        !statusMonetizacaoComprovada.has(
          String(o.status || "")
        )
      );

    const resumoOportunidades = oportunidades
      .map((o) => {
        const dores = Array.isArray(o.dor_relacionada)
          ? o.dor_relacionada.slice(0, 3).join(", ")
          : "dor não especificada";

        const classificacao =
          statusMonetizacaoComprovada.has(String(o.status || ""))
            ? "monetização pública documentada"
            : "parceria a qualificar";

        return `${o.empresa}: ${classificacao}. Resolve ou atende dores ligadas a ${dores}. Próxima ação: ${o.proxima_acao}`;
      })
      .join(" ");

    return {
      resposta:
        `O Turing Opportunities possui ${oportunidades.length} oportunidades registradas no radar do agro. ` +
        `${monetizacaoComprovada.length} possuem comissão ou bônus público documentado e ` +
        `${parceriasAQualificar.length} ainda precisam de qualificação comercial. ` +
        `${resumoOportunidades} ` +
        `O Turing não deve tratar parceria potencial como negócio fechado.`,

      fontes: [
        ...new Set(
          oportunidades
            .map((o) => o.fonte)
            .filter(Boolean)
        )
      ],

      dados: {
        radar: radarOportunidades.id,
        ultima_verificacao:
          radarOportunidades.ultima_verificacao,

        total_oportunidades:
          oportunidades.length,

        monetizacao_comprovada:
          monetizacaoComprovada,

        parcerias_a_qualificar:
          parceriasAQualificar,

        oportunidades,

        regras:
          radarOportunidades.regras_turing || []
      },

      contexto: {
        pais: "Brasil",
        regiao: "Centro-Oeste",
        estado_prioritario: "Goiás",
        dominio: "oportunidades_comerciais",
        agente: "Turing Brasil",
        radar: "Turing Opportunities"
      }
    };
  }

  return {
    resposta:
      "O Turing Brasil está em mapeamento do agro do Centro-Oeste, com Goiás como núcleo prioritário. Já possui baseline de produção, armazenagem, corredor logístico, Paranagel e rede comercial inicial. As próximas análises devem buscar dores comprovadas, oportunidades comerciais e empresas que possam oferecer soluções com possibilidade real de parceria.",
    fontes: [
      "Turing Brasil — território Centro-Oeste",
      "Turing Brasil — baseline agroterritorial"
    ],
    dados: {
      territorio: {
        estado_prioritario:
          territorio.nucleo_geografico?.estado_prioritario?.nome,
        municipios_prioritarios:
          territorio.municipios_prioritarios?.map((x) => x.nome)
      },
      evidencias:
        camada.evidencias?.map((x) => ({
          codigo: x.codigo,
          tema: x.tema,
          status: x.status
        }))
    },
    contexto: {
      pais: "Brasil",
      regiao: "Centro-Oeste",
      estado_prioritario: "Goiás",
      dominio: "agro_intelligence",
      agente: "Turing Brasil"
    }
  };
}

module.exports = {
  responderTuringBrasil,
  perguntaBrasil
};
