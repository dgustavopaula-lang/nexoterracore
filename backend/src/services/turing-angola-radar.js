"use strict";

/*
 * Turing Angola Radar
 * Camada READ-ONLY para inteligência da Fazenda PIPE.
 * Toda consulta respeita organizacao_id.
 */

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extrairOrganizacaoId(auth = {}) {
  return (
    auth.organizacaoId ||
    auth.organizacao_id ||
    auth.tenantId ||
    null
  );
}

function perguntaAngola(pergunta = "") {
  const p = normalizar(pergunta);

  
  // EARTHOBS_SPECIALIZED_TERMS
  const termosEarthObservation = [
    "worldcover",
    "sentinel",
    "sentinel-2",
    "earth observation",
    "observacao da terra",
    "cobertura do solo"
  ];

  if (termosEarthObservation.some((termo) => p.includes(termo))) {
    return true;
  }

const termos = [
    "angola",
    "malanje",
    "cacuso",
    "fazenda pipe",
    "fazenda pip",
    "pipe angola",
    "agroafrica",
    "agro africa",
    "embrapa",
    "semente",
    "sementes",
    "milho",
    "finep",
    "monashees",
    "bndes",
    "planagrao",
    "citic",
    "sinohydro",
    "georreferenciamento",
    "azimute",
    "kml"
  ];

  return termos.some((termo) => p.includes(termo));
}

async function tenantPipeAutorizado(pool, organizacaoId) {
  if (!organizacaoId) return false;

  const resultado = await pool.query(
    `
      SELECT id, nome, slug
      FROM organizacoes
      WHERE id = $1
      LIMIT 1
    `,
    [organizacaoId]
  );

  return (
    resultado.rowCount === 1 &&
    resultado.rows[0].slug === "pipe-angola"
  );
}

async function listarSinaisAngola(pool, auth, filtros = {}) {
  const organizacaoId = extrairOrganizacaoId(auth);

  if (!organizacaoId) return [];

  const parametros = [organizacaoId];
  const filtrosSql = ["organizacao_id = $1"];

  if (filtros.status) {
    parametros.push(filtros.status);
    filtrosSql.push(`status = $${parametros.length}`);
  }

  if (filtros.termo) {
    parametros.push(`%${filtros.termo}%`);
    const n = parametros.length;

    filtrosSql.push(`
      (
        tema ILIKE $${n}
        OR setor ILIKE $${n}
        OR palavra_chave ILIKE $${n}
        OR resumo ILIKE $${n}
        OR sinal ILIKE $${n}
        OR fonte ILIKE $${n}
      )
    `);
  }

  const limite = Math.min(
    Math.max(Number(filtros.limite) || 20, 1),
    50
  );

  const resultado = await pool.query(
    `
      SELECT
        id,
        agente,
        pais,
        provincia,
        municipio,
        latitude,
        longitude,
        setor,
        tema,
        palavra_chave,
        fonte,
        url,
        data_fonte,
        resumo,
        sinal,
        relevancia,
        status,
        dados,
        coletado_em,
        atualizado_em
      FROM turing_angola_radar
      WHERE ${filtrosSql.join(" AND ")}
      ORDER BY
        relevancia DESC,
        atualizado_em DESC,
        id DESC
      LIMIT ${limite}
    `,
    parametros
  );

  return resultado.rows;
}

async function resumirRadarAngola(pool, auth) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const resultado = await pool.query(
    `
      SELECT
        COUNT(*)::int AS sinais,
        COUNT(*) FILTER (
          WHERE status = 'validado'
        )::int AS validados,
        COUNT(*) FILTER (
          WHERE status = 'monitorando'
        )::int AS monitorando,
        COUNT(*) FILTER (
          WHERE status = 'novo'
        )::int AS novos,
        COUNT(DISTINCT setor)::int AS setores,
        MAX(coletado_em) AS ultima_coleta
      FROM turing_angola_radar
      WHERE organizacao_id = $1
    `,
    [organizacaoId]
  );

  return resultado.rows[0];
}

async function consultarGeoPIPE(pool, auth) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const resultado = await pool.query(
    `
      SELECT
        id,
        pais,
        provincia,
        municipio,
        latitude,
        longitude,
        tema,
        resumo,
        sinal,
        relevancia,
        status,
        dados
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND tema = 'Fazenda PIPE — referência territorial'
      ORDER BY atualizado_em DESC
      LIMIT 1
    `,
    [organizacaoId]
  );

  return resultado.rows[0] || null;
}

async function consultarAtivoPIPE(pool, auth) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const resultado = await pool.query(
    `
      SELECT
        id,
        tema,
        resumo,
        sinal,
        relevancia,
        status,
        dados
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND tema = 'Fazenda PIPE — ativo real'
      ORDER BY atualizado_em DESC
      LIMIT 1
    `,
    [organizacaoId]
  );

  return resultado.rows[0] || null;
}

async function consultarSementesPIPE(pool, auth) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        url,
        data_fonte,
        resumo,
        sinal,
        relevancia,
        status,
        dados
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND (
          tema ILIKE '%semente%'
          OR palavra_chave ILIKE '%milho%'
          OR palavra_chave ILIKE '%embrapa%'
          OR setor ILIKE '%Embrapa%'
        )
      ORDER BY
        (status = 'validado') DESC,
        relevancia DESC,
        atualizado_em DESC
    `,
    [organizacaoId]
  );

  return resultado.rows;
}

async function consultarFinanciamentoAngola(pool, auth) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        url,
        data_fonte,
        resumo,
        sinal,
        relevancia,
        status,
        dados
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND (
          setor ILIKE '%financiamento%'
          OR setor ILIKE '%startup%'
          OR setor ILIKE '%investimento%'
          OR tema ILIKE '%BNDES%'
          OR tema ILIKE '%Finep%'
          OR tema ILIKE '%Monashees%'
          OR palavra_chave ILIKE '%BNDES%'
          OR palavra_chave ILIKE '%Finep%'
        )
      ORDER BY
        (status = 'validado') DESC,
        relevancia DESC,
        atualizado_em DESC
    `,
    [organizacaoId]
  );

  return resultado.rows;
}

async function compararRadarDiario(pool, auth) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const resultado = await pool.query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE
            (coletado_em AT TIME ZONE 'Africa/Luanda')::date =
            (NOW() AT TIME ZONE 'Africa/Luanda')::date
        )::int AS coletados_hoje,

        COUNT(*) FILTER (
          WHERE
            status = 'validado'
            AND
            (atualizado_em AT TIME ZONE 'Africa/Luanda')::date =
            (NOW() AT TIME ZONE 'Africa/Luanda')::date
        )::int AS validados_hoje,

        COUNT(*) FILTER (
          WHERE status = 'monitorando'
        )::int AS monitorando,

        COUNT(DISTINCT setor)::int AS setores,

        MAX(relevancia)::int AS relevancia_maxima,

        MAX(coletado_em) AS ultima_coleta

      FROM turing_angola_radar
      WHERE organizacao_id = $1
    `,
    [organizacaoId]
  );

  return resultado.rows[0];
}

function fontesDosRegistros(registros = []) {
  const lista = Array.isArray(registros)
    ? registros
    : [registros];

  return [
    ...new Set(
      lista
        .filter(Boolean)
        .map((item) => {
          const fonte = item.fonte || "NexoTerraCore";
          const url = item.url ? ` — ${item.url}` : "";
          return `${fonte}${url}`;
        })
    )
  ];
}

function formatarSinais(registros) {
  return registros
    .slice(0, 8)
    .map((item) => {
      const prefixo =
        item.status === "validado"
          ? "VALIDADO"
          : item.status === "monitorando"
          ? "MONITORANDO"
          : String(item.status || "SEM STATUS").toUpperCase();

      return `${prefixo}: ${item.tema}`;
    })
    .join("; ");
}


async function consultarCamada1Cacuso(pool, auth, tema) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const mapaTemas = {
    administrativo: "Cacuso — estrutura administrativa",
    hidrografia: "Cacuso — limites hidrográficos oficiais",
    rodovias: "Cacuso — corredores rodoviários oficiais"
  };

  const nomeTema = mapaTemas[tema];
  if (!nomeTema || !organizacaoId) return null;

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        resumo,
        sinal,
        dados,
        status,
        relevancia,
        atualizado_em
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND tema = $2
        AND status = 'validado'
      ORDER BY atualizado_em DESC
      LIMIT 1
    `,
    [organizacaoId, nomeTema]
  );

  return resultado.rows[0] || null;
}


async function consultarCamada2Cacuso(pool, auth, tema) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const mapaTemas = {
    ferrovia: "Cacuso — corredor ferroviário CFL",
    agroinfra: "Quizenga — infraestrutura de armazenagem e processamento",
    corredor: "Corredor de Malanje — AgriConnect Angola"
  };

  const nomeTema = mapaTemas[tema];

  if (!organizacaoId || !nomeTema) {
    return null;
  }

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        resumo,
        sinal,
        dados,
        status,
        relevancia,
        atualizado_em
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND tema = $2
        AND status = 'validado'
      ORDER BY atualizado_em DESC
      LIMIT 1
    `,
    [organizacaoId, nomeTema]
  );

  return resultado.rows[0] || null;
}


async function consultarCamada3Malanje(pool, auth, tema) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const mapaTemas = {
    clima: "Malanje — baseline climático regional",
    meio_fisico: "Malanje — relevo altitude e solos regionais"
  };

  const nomeTema = mapaTemas[tema];

  if (!organizacaoId || !nomeTema) {
    return null;
  }

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        url,
        resumo,
        sinal,
        dados,
        status,
        relevancia,
        atualizado_em
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND tema = $2
        AND status = 'validado'
      ORDER BY atualizado_em DESC
      LIMIT 1
    `,
    [organizacaoId, nomeTema]
  );

  return resultado.rows[0] || null;
}


async function consultarCamada4EarthObservation(pool, auth, tema) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const mapaTemas = {
    sentinel: "Sentinel-2 — capacidade de observação territorial",
    worldcover: "ESA WorldCover — cobertura do solo"
  };

  const nomeTema = mapaTemas[tema];

  if (!organizacaoId || !nomeTema) {
    return null;
  }

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        url,
        resumo,
        sinal,
        dados,
        status,
        relevancia,
        atualizado_em
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND tema = $2
        AND status = 'validado'
      ORDER BY atualizado_em DESC
      LIMIT 1
    `,
    [organizacaoId, nomeTema]
  );

  return resultado.rows[0] || null;
}


async function consultarCamada5AguaIrrigacao(pool, auth, tema) {
  const organizacaoId = extrairOrganizacaoId(auth);

  const mapaTemas = {
    agua: "Cacuso — sistema público de captação e distribuição de água",
    irrigacao: "Quizenga — referência regional de infraestrutura de irrigação"
  };

  const nomeTema = mapaTemas[tema];

  if (!organizacaoId || !nomeTema) {
    return null;
  }

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        url,
        resumo,
        sinal,
        dados,
        status,
        relevancia,
        atualizado_em
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND tema = $2
        AND status = 'validado'
      ORDER BY atualizado_em DESC
      LIMIT 1
    `,
    [organizacaoId, nomeTema]
  );

  return resultado.rows[0] || null;
}


async function consultarSinteseTerritorialPIPE(pool, auth) {
  const organizacaoId = extrairOrganizacaoId(auth);

  if (!organizacaoId) {
    return [];
  }

  const resultado = await pool.query(
    `
      SELECT
        id,
        setor,
        tema,
        fonte,
        resumo,
        sinal,
        dados,
        status,
        relevancia
      FROM turing_angola_radar
      WHERE organizacao_id = $1
        AND status = 'validado'
        AND dados->>'camada' IN ('1','2','3','4','5')
      ORDER BY
        (dados->>'camada')::int,
        relevancia DESC,
        id
    `,
    [organizacaoId]
  );

  return resultado.rows;
}

async function responderTuringAngola(
  pool,
  auth,
  pergunta
) {
  if (!perguntaAngola(pergunta)) {
    return null;
  }

  const organizacaoId = extrairOrganizacaoId(auth);

  if (!organizacaoId) {
    return null;
  }

  const autorizado = await tenantPipeAutorizado(
    pool,
    organizacaoId
  );

  /*
   * Segurança multitenancy:
   * se a sessão não estiver no tenant PIPE Angola,
   * não acessamos seus dados.
   */
  if (!autorizado) {
    return null;
  }

  const p = normalizar(pergunta);

  /*
   * CAMADA 1 CACUSO
   */
  if (
    /\brios?\b/.test(p) ||
    /\bhidrograf/.test(p) ||
    /\bcursos? de agua\b/.test(p)
  ) {
    const registro = await consultarCamada1Cacuso(
      pool,
      auth,
      "hidrografia"
    );

    if (registro) {
      const rios = Array.isArray(registro.dados?.rios_referenciados)
        ? registro.dados.rios_referenciados
        : [];

      return {
        resposta:
          `No contexto territorial validado de Cacuso, os cursos de água referenciados incluem ${rios.join(", ")}. ` +
          `Essas referências ajudam a estruturar os limites municipais e não representam o perímetro da Fazenda PIPE.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: registro.dados,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 1
        }
      };
    }
  }

  if (
    p.includes("estrada") ||
    p.includes("rodovia") ||
    p.includes("acesso") ||
    p.includes("en225") ||
    p.includes("en322")
  ) {
    const registro = await consultarCamada1Cacuso(
      pool,
      auth,
      "rodovias"
    );

    if (registro) {
      const vias = Array.isArray(registro.dados?.vias)
        ? registro.dados.vias
        : [];

      return {
        resposta:
          `No Radar Angola estão validados como referências rodoviárias regionais de Cacuso: ${vias.join(" e ")}. ` +
          `A ligação regional Cacuso–Malanje está registrada, mas o acesso exato até a Fazenda PIPE ainda depende do georreferenciamento definitivo da propriedade.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: registro.dados,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 1
        }
      };
    }
  }

  if (
    p.includes("comuna") ||
    p.includes("administrativ") ||
    p.includes("soqueco")
  ) {
    const registro = await consultarCamada1Cacuso(
      pool,
      auth,
      "administrativo"
    );

    if (registro) {
      const comunas = Array.isArray(registro.dados?.comunas)
        ? registro.dados.comunas
        : [];

      return {
        resposta:
          `Cacuso integra a Província de Malanje. Na camada administrativa validada do Radar, aparecem as comunas de ${comunas.join(" e ")}.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: registro.dados,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 1
        }
      };
    }
  }

  /*
   * CAMADA 2 CACUSO
   */

  if (
    /\bferrovia\b/.test(p) ||
    /\bferroviari/.test(p) ||
    /\btrem\b/.test(p) ||
    p.includes("caminho de ferro") ||
    p.includes("zenza") ||
    /\bcfl\b/.test(p)
  ) {
    const registro = await consultarCamada2Cacuso(
      pool,
      auth,
      "ferrovia"
    );

    if (registro) {
      return {
        resposta:
          `Existe infraestrutura ferroviária regional relevante para Cacuso. ` +
          `O Radar registra o troço Zenza do Itombe–Cacuso no contexto do Caminho de Ferro de Luanda. ` +
          `A relação logística específica dessa ferrovia com a Fazenda PIPE ainda não está confirmada.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: registro.dados,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 2
        }
      };
    }
  }

  if (
    /\bsilos?\b/.test(p) ||
    /\barmazen/.test(p) ||
    /\bprocessamento\b/.test(p) ||
    p.includes("quizenga") ||
    /\bbascula\b/.test(p) ||
    /\bfuba\b/.test(p)
  ) {
    const registro = await consultarCamada2Cacuso(
      pool,
      auth,
      "agroinfra"
    );

    if (registro) {
      const d = registro.dados || {};

      return {
        resposta:
          `Na região de Cacuso, o Radar registra em Quizenga uma referência agroindustrial com ` +
          `silos de capacidade indicada de ${d.silos_capacidade_t || 4500} toneladas, ` +
          `processamento de milho e estrutura de apoio logístico. ` +
          `Essa infraestrutura é regional e não pertence à Fazenda PIPE.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: d,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 2
        }
      };
    }
  }

  if (
    p.includes("corredor de malanje") ||
    p.includes("agriconnect") ||
    (
      /\bcorredor\b/.test(p) &&
      /\bmalanje\b/.test(p)
    )
  ) {
    const registro = await consultarCamada2Cacuso(
      pool,
      auth,
      "corredor"
    );

    if (registro) {
      const componentes =
        Array.isArray(registro.dados?.componentes)
          ? registro.dados.componentes
          : [];

      return {
        resposta:
          `O Corredor de Malanje aparece no Radar como eixo regional do programa AgriConnect Angola. ` +
          `Os componentes registrados incluem ${componentes.join(", ")}. ` +
          `Uma oportunidade específica para a Fazenda PIPE ainda precisa ser validada antes de ser tratada como fato.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: registro.dados,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 2
        }
      };
    }
  }

  /*
   * CAMADA 3 MALANJE
   */

  if (
    /\bclima\b/.test(p) ||
    /\bchuva/.test(p) ||
    /\bprecipit/.test(p) ||
    /\btemperatura/.test(p) ||
    /\bcacimbo\b/.test(p) ||
    p.includes("estacao chuvosa")
  ) {
    const registro = await consultarCamada3Malanje(
      pool,
      auth,
      "clima"
    );

    if (registro) {
      const d = registro.dados || {};

      return {
        resposta:
          `Como baseline regional de Malanje, a fonte registrada no Radar indica ` +
          `temperaturas de aproximadamente ${d.temperatura_regional_c_min} a ${d.temperatura_regional_c_max} °C ` +
          `e precipitação anual regional de cerca de ${d.precipitacao_anual_mm_min} a ${d.precipitacao_anual_mm_max} mm. ` +
          `O período chuvoso de referência está registrado como ${d.estacao_chuvosa_referencia}, com período seco associado ao cacimbo. ` +
          `Esses dados são regionais e históricos; não representam medição meteorológica em tempo real dentro da Fazenda PIPE.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: d,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 3,
          escopo: "regional"
        }
      };
    }
  }

  if (
    /\baltitude\b/.test(p) ||
    /\brelevo\b/.test(p) ||
    /\bdeclividade\b/.test(p)
  ) {
    const registro = await consultarCamada3Malanje(
      pool,
      auth,
      "meio_fisico"
    );

    if (registro) {
      const d = registro.dados || {};

      return {
        resposta:
          `A referência física regional registrada para Malanje indica uma faixa altimétrica aproximada de ` +
          `${d.altitude_regional_m_min} a ${d.altitude_regional_m_max} metros. ` +
          `Essa faixa descreve o contexto regional e não confirma a altitude ou a declividade da Fazenda PIPE. ` +
          `Para isso ainda precisamos de dados geoespaciais específicos da propriedade.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: d,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 3,
          escopo: "regional"
        }
      };
    }
  }

  const perguntaEarthObservationSolo =
    p.includes("cobertura do solo") ||
    p.includes("uso do solo") ||
    p.includes("classificacao do solo") ||
    p.includes("worldcover");

  if (
    !perguntaEarthObservationSolo &&
    (
      /\bsolos?\b/.test(p) ||
      p.includes("fersialit") ||
      p.includes("psamit")
    )
  ) {
    const registro = await consultarCamada3Malanje(
      pool,
      auth,
      "meio_fisico"
    );

    if (registro) {
      const d = registro.dados || {};
      const solos = Array.isArray(d.solos_referenciados)
        ? d.solos_referenciados
        : [];

      return {
        resposta:
          `Na referência regional registrada para Malanje aparecem solos ${solos.join(" e ")}. ` +
          `Isso não confirma o tipo de solo existente dentro da Fazenda PIPE; uma caracterização específica da propriedade ainda depende de dados de campo ou de fonte geoespacial validada.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: d,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 3,
          escopo: "regional"
        }
      };
    }
  }

  /*
   * CAMADA 4 EARTH OBSERVATION
   */

  if (
    p.includes("sentinel") ||
    /\bsatelite\b/.test(p) ||
    /\bsatelites\b/.test(p) ||
    p.includes("observacao da terra") ||
    /\bndvi\b/.test(p)
  ) {
    const registro = await consultarCamada4EarthObservation(
      pool,
      auth,
      "sentinel"
    );

    if (registro) {
      const d = registro.dados || {};

      return {
        resposta:
          `O Turing tem o Sentinel-2 registrado como fonte de observação da Terra para o contexto de Malanje e Cacuso. ` +
          `A missão utiliza ${d.bandas_espectrais || 13} bandas espectrais, incluindo bandas de ${d.bandas_10m || 4} canais a 10 metros. ` +
          `Ela pode apoiar análises de vegetação, água, solo e mudanças da superfície. ` +
          `Ainda não existe análise específica da Fazenda PIPE porque o perímetro real da propriedade não foi validado.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: d,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 4,
          escopo: "earth_observation"
        }
      };
    }
  }

  if (
    p.includes("worldcover") ||
    p.includes("cobertura do solo") ||
    p.includes("uso do solo") ||
    p.includes("classificacao do solo") ||
    p.includes("classificação do solo")
  ) {
    const registro = await consultarCamada4EarthObservation(
      pool,
      auth,
      "worldcover"
    );

    if (registro) {
      const d = registro.dados || {};

      return {
        resposta:
          `O Radar possui o ESA WorldCover como referência de cobertura do solo, com resolução registrada de ${d.resolucao_m || 10} metros e ${d.classes || 11} classes. ` +
          `Porém, o Turing ainda não pode afirmar qual é a cobertura do solo dos 8.600 hectares da Fazenda PIPE. ` +
          `A classificação específica permanece pendente porque ainda não temos o perímetro real validado da propriedade.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: d,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 4,
          escopo: "earth_observation"
        }
      };
    }
  }

  /*
   * CAMADA 5 AGUA E IRRIGACAO
   */

  if (
    /\bpipe\b/.test(p) &&
    (
      /\bagua\b/.test(p) ||
      /\birrig/.test(p) ||
      /\bcaptacao\b/.test(p) ||
      /\bvazao\b/.test(p) ||
      /\bhidric/.test(p)
    )
  ) {
    const agua = await consultarCamada5AguaIrrigacao(
      pool,
      auth,
      "agua"
    );

    const irrigacao = await consultarCamada5AguaIrrigacao(
      pool,
      auth,
      "irrigacao"
    );

    return {
      resposta:
        `O Turing ainda não possui evidência validada de captação, vazão, disponibilidade hídrica ou sistema de irrigação próprio da Fazenda PIPE. ` +
        `Existem referências regionais em Cacuso: infraestrutura pública de captação, tratamento e distribuição de água e um projecto de irrigação em Quizenga. ` +
        `Essas referências não devem ser atribuídas à PIPE sem dados específicos da propriedade.`,
      fontes: [
        agua?.fonte,
        irrigacao?.fonte
      ].filter(Boolean),
      dados: {
        agua_regional: agua?.dados || null,
        irrigacao_regional: irrigacao?.dados || null,
        captacao_pipe_confirmada: false,
        vazao_pipe_confirmada: false,
        irrigacao_pipe_confirmada: false
      },
      contexto: {
        continente: "África",
        pais: "Angola",
        provincia: "Malanje",
        municipio: "Cacuso",
        camada: 5,
        escopo: "regional_com_separacao_pipe"
      }
    };
  }

  if (
    /\birrigacao\b/.test(p) ||
    /\birrigada\b/.test(p) ||
    /\birrigado\b/.test(p) ||
    p.includes("quizenga")
  ) {
    const registro = await consultarCamada5AguaIrrigacao(
      pool,
      auth,
      "irrigacao"
    );

    if (registro) {
      const d = registro.dados || {};

      return {
        resposta:
          `Em Cacuso, o Radar registra Quizenga como referência regional de infraestrutura de irrigação, ` +
          `com área de projecto indicada de ${d.area_projeto_hectares || 5000} hectares. ` +
          `Isso não significa que a Fazenda PIPE possua irrigação ou esteja conectada a esse projecto.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: d,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 5,
          escopo: "regional"
        }
      };
    }
  }

  const perguntaAguaRegional =
    (
      /\bcaptacao\b/.test(p) &&
      /\bagua\b/.test(p)
    ) ||
    (
      /\bdistribuicao\b/.test(p) &&
      /\bagua\b/.test(p)
    ) ||
    (
      /\btratamento\b/.test(p) &&
      /\bagua\b/.test(p)
    ) ||
    p.includes("sistema de agua") ||
    (
      /\babastecimento\b/.test(p) &&
      /\bagua\b/.test(p)
    );

  if (perguntaAguaRegional) {
    const registro = await consultarCamada5AguaIrrigacao(
      pool,
      auth,
      "agua"
    );

    if (registro) {
      return {
        resposta:
          `O Radar registra em Cacuso uma referência oficial de infraestrutura municipal de captação, tratamento e distribuição de água. ` +
          `Esse dado descreve infraestrutura regional e não comprova captação, vazão ou disponibilidade hídrica dentro da Fazenda PIPE.`,
        fontes: [registro.fonte || "turing_angola_radar"],
        dados: registro.dados,
        contexto: {
          continente: "África",
          pais: "Angola",
          provincia: "Malanje",
          municipio: "Cacuso",
          camada: 5,
          escopo: "regional"
        }
      };
    }
  }

  /*
   * CAMADA 6 SINTESE TERRITORIAL
   *
   * Cruza apenas conhecimento validado das camadas 1-5.
   * Nunca transforma inferencia em fato.
   */

  if (
    (
      p.includes("sintese territorial") ||
      p.includes("inteligencia territorial") ||
      p.includes("cruzar camadas") ||
      p.includes("cruze as camadas") ||
      p.includes("leitura territorial") ||
      p.includes("analise territorial")
    ) &&
    /\bpipe\b/.test(p)
  ) {
    const registros = await consultarSinteseTerritorialPIPE(
      pool,
      auth
    );

    const porCamada = {};

    for (const registro of registros) {
      const camada = Number(registro.dados?.camada || 0);

      if (!porCamada[camada]) {
        porCamada[camada] = [];
      }

      porCamada[camada].push({
        tema: registro.tema,
        fonte: registro.fonte,
        dados: registro.dados
      });
    }

    const fatos = [
      "A Fazenda PIPE está contextualizada em Cacuso, Província de Malanje, Angola.",
      "A área registrada no projeto é de 8.600 hectares.",
      "O Radar possui referências validadas de território, logística, clima e meio físico, Earth Observation e infraestrutura hídrica regional."
    ];

    const inferencias = [
      "A combinação entre corredor logístico, referências agroindustriais e infraestrutura regional indica um contexto territorial com potencial para análises agrícolas e logísticas mais profundas.",
      "Sentinel-2 e ESA WorldCover podem apoiar observação territorial assim que existir um perímetro geográfico validado da propriedade.",
      "As referências regionais de água e irrigação justificam investigação hídrica específica da PIPE, mas não comprovam disponibilidade de água dentro da fazenda."
    ];

    const pendencias = [
      "perímetro georreferenciado real da Fazenda PIPE",
      "coordenadas dos vértices ou arquivo KML/GeoJSON",
      "altitude e declividade específicas da propriedade",
      "caracterização específica dos solos da PIPE",
      "captação, vazão e disponibilidade hídrica próprias",
      "sistema de irrigação próprio ou conexão comprovada",
      "classificação real da cobertura do solo dos 8.600 hectares"
    ];

    return {
      resposta:
        `Síntese territorial da Fazenda PIPE: o Turing já possui cinco camadas regionais validadas para Cacuso e Malanje. ` +
        `Elas permitem contextualizar território, logística, clima e meio físico, observação da Terra e recursos hídricos. ` +
        `A principal limitação continua sendo a ausência do perímetro georreferenciado real da propriedade. ` +
        `Por isso, análises específicas dos 8.600 hectares ainda devem permanecer como pendentes, e não como fatos confirmados.`,
      fontes: [...new Set(
        registros
          .map((r) => r.fonte)
          .filter(Boolean)
      )],
      dados: {
        camadas_validadas: Object.keys(porCamada)
          .map(Number)
          .sort((a, b) => a - b),
        registros_validados: registros.length,
        fatos,
        inferencias,
        pendencias,
        conhecimento_por_camada: porCamada
      },
      contexto: {
        continente: "África",
        pais: "Angola",
        provincia: "Malanje",
        municipio: "Cacuso",
        propriedade: "Fazenda PIPE",
        camada: 6,
        modo: "sintese_multicamadas",
        regra: "fato_inferencia_pendencia"
      }
    };
  }

  /*
   * GEO / PIPE
   */
  if (
    p.includes("onde") ||
    p.includes("localizacao") ||
    p.includes("coordenada") ||
    p.includes("mapa") ||
    p.includes("geo") ||
    p.includes("georreferenciamento") ||
    p.includes("azimute") ||
    p.includes("kml") ||
    p.includes("hectare") ||
    p.includes("tamanho") ||
    p.includes("fuso") ||
    p.includes("continente") ||
    p.includes("provincia") ||
    p.includes("municipio")
  ) {
    const geo = await consultarGeoPIPE(pool, auth);
    const ativo = await consultarAtivoPIPE(pool, auth);

    if (!geo) {
      return {
        resposta:
          "Não existem dados geográficos suficientes da Fazenda PIPE no Radar.",
        fontes: ["turing_angola_radar"],
        dados: null
      };
    }

    const dados = {
      ...(geo.dados || {}),
      ...(ativo?.dados || {})
    };

    const area =
      dados.area_hectares ||
      dados.area_fazenda_hectares ||
      8600;

    if (p.includes("azimute")) {
      return {
        resposta:
          "O azimute da Fazenda PIPE ainda está pendente. O Radar possui somente uma referência territorial regional em Cacuso, Malanje. O cálculo real exige KML ou pelo menos dois pontos geográficos reais.",
        fontes: ["turing_angola_radar"],
        dados: {
          area_hectares: area,
          latitude_referencia: geo.latitude,
          longitude_referencia: geo.longitude,
          azimute_status:
            dados.azimute_status ||
            "pendente_de_kml_ou_dois_pontos"
        }
      };
    }

    return {
      resposta:
        `A Fazenda PIPE está contextualizada no Turing em Cacuso, Província de Malanje, Angola, África. ` +
        `A área registrada no projeto é de ${area} hectares. ` +
        `A referência regional utilizada pelo Radar é latitude ${geo.latitude} e longitude ${geo.longitude}. ` +
        `Essa coordenada serve para contexto territorial e mapa, não representa ainda o perímetro oficial da propriedade. ` +
        `Fuso operacional: Africa/Luanda (UTC+1).`,

      fontes: ["turing_angola_radar"],

      dados: {
        pais: "Angola",
        continente: "África",
        provincia: geo.provincia,
        municipio: geo.municipio,
        area_hectares: area,
        latitude_referencia: geo.latitude,
        longitude_referencia: geo.longitude,
        timezone: "Africa/Luanda",
        precisao: "referencia_regional"
      }
    };
  }

  /*
   * SEMENTES / MILHO / EMBRAPA
   */
  if (
    p.includes("semente") ||
    p.includes("milho") ||
    p.includes("embrapa") ||
    p.includes("cultivar") ||
    p.includes("fornecedor")
  ) {
    const registros = await consultarSementesPIPE(
      pool,
      auth
    );

    if (!registros.length) {
      return {
        resposta:
          "Não existem registros suficientes sobre sementes de milho no Radar Angola.",
        fontes: ["turing_angola_radar"],
        dados: []
      };
    }

    return {
      resposta:
        "Existe uma operação real em monitoramento para sementes de milho do Brasil destinadas à Fazenda PIPE, em Angola. " +
        "O Radar acompanha cultivar, tecnologia/Embrapa, fornecedor ou licenciado, documentação fitossanitária, MAPA, T-Rex, logística, importação, custos e financiamento. " +
        "Fornecedor, cultivar, volume e documentação que ainda não tenham evidência registrada devem permanecer como pendentes de validação. " +
        "A Embrapa deve ser tratada conforme o papel efetivamente comprovado na operação — tecnologia, cultivar, licenciamento ou fornecimento — sem presumir automaticamente o fornecedor comercial.",

      fontes: fontesDosRegistros(registros),

      dados: registros
    };
  }

  /*
   * FINANCIAMENTO / FINEP / BNDES / MONASHEES
   */
  if (
    p.includes("financiamento") ||
    p.includes("finep") ||
    p.includes("bndes") ||
    p.includes("monashees") ||
    p.includes("fundo") ||
    p.includes("capital") ||
    p.includes("investimento")
  ) {
    const registros =
      await consultarFinanciamentoAngola(
        pool,
        auth
      );

    if (!registros.length) {
      return {
        resposta:
          "Não existem sinais de financiamento registrados no Radar Angola.",
        fontes: ["turing_angola_radar"],
        dados: []
      };
    }

    const monashees = registros.find(
      (item) =>
        normalizar(item.tema).includes("finep") ||
        normalizar(item.dados?.gestora).includes(
          "monashees"
        )
    );

    let texto =
      "O Radar possui oportunidades de financiamento e investimento classificadas entre sinais validados e sinais em monitoramento. ";

    if (monashees) {
      texto +=
        "O sinal Finep/BNDES registra a Monashees Gestão de Investimentos como gestora selecionada para a estruturação do fundo de IA com estimativa de mobilização de até R$ 500 milhões. " +
        "O registro permanece classificado como oportunidade institucional: não representa aprovação, financiamento concedido ou investimento contratado para o NexoTerraCore. ";
    }

    texto += formatarSinais(registros);

    return {
      resposta: texto,
      fontes: fontesDosRegistros(registros),
      dados: registros
    };
  }

  /*
   * RADAR DIÁRIO
   */
  if (
    p.includes("hoje") ||
    p.includes("mudou") ||
    p.includes("diario") ||
    p.includes("ultima coleta")
  ) {
    const diario = await compararRadarDiario(
      pool,
      auth
    );

    return {
      resposta:
        `Radar Angola hoje: ${diario.coletados_hoje} sinal(is) coletado(s), ` +
        `${diario.validados_hoje} validado(s) hoje, ` +
        `${diario.monitorando} em monitoramento, ` +
        `${diario.setores} setores acompanhados. ` +
        `Última coleta: ${diario.ultima_coleta || "não disponível"}.`,

      fontes: ["turing_angola_radar"],

      dados: diario
    };
  }

  /*
   * RESUMO GERAL ANGOLA / PIPE
   */
  const resumo = await resumirRadarAngola(
    pool,
    auth
  );

  const sinais = await listarSinaisAngola(
    pool,
    auth,
    { limite: 8 }
  );

  return {
    resposta:
      `Turing Angola está monitorando ${resumo.sinais} sinais em ${resumo.setores} setores para o contexto PIPE Angola. ` +
      `${resumo.validados} sinais estão validados e ${resumo.monitorando} permanecem em monitoramento. ` +
      `Principais sinais: ${formatarSinais(sinais)}.`,

    fontes: fontesDosRegistros(sinais),

    dados: {
      resumo,
      sinais
    },

    contexto: {
      continente: "África",
      pais: "Angola",
      provincia: "Malanje",
      municipio: "Cacuso",
      organizacao: "PIPE Angola",
      timezone: "Africa/Luanda"
    }
  };
}

module.exports = {
  perguntaAngola,
  listarSinaisAngola,
  resumirRadarAngola,
  consultarGeoPIPE,
  consultarAtivoPIPE,
  consultarSementesPIPE,
  consultarFinanciamentoAngola,
  compararRadarDiario,
  responderTuringAngola
};
