"use strict";

const https = require("https");

const UFS = {
  GO: { codigo: 52, nome: "Goiás" },
  MT: { codigo: 51, nome: "Mato Grosso" },
  MS: { codigo: 50, nome: "Mato Grosso do Sul" },
  DF: { codigo: 53, nome: "Distrito Federal" }
};

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "NexoTerraCore-Gaia/1.0",
        "Accept": "application/json"
      }
    }, res => {
      let body = "";

      res.on("data", c => body += c);

      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`SIDRA HTTP ${res.statusCode}`));
        }

        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("SIDRA retornou JSON inválido"));
        }
      });
    }).on("error", reject);
  });
}

function normalizarValor(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === "" ||
    valor === "-" ||
    valor === ".." ||
    valor === "..."
  ) {
    return null;
  }

  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

async function consultarUF(sigla) {
  const uf = UFS[sigla];

  if (!uf)
    throw new Error(`UF não autorizada: ${sigla}`);

  /*
   * SIDRA/PAM 5457
   * n3 = Unidade da Federação
   * v/all = variáveis
   * p/last 1 = período mais recente
   * c782/all = produtos
   */
  const url =
    `https://apisidra.ibge.gov.br/values/t/5457/n3/${uf.codigo}` +
    `/v/all/p/last%201/c782/all`;

  const resposta = await getJson(url);

  if (!Array.isArray(resposta) || resposta.length < 2)
    throw new Error(`SIDRA sem dados para ${sigla}`);

  return resposta.slice(1).map(r => ({
    agente: "gaia",
    coordenador: "turing",

    territorio: {
      regiao: "Centro-Oeste",
      uf: sigla,
      nome: uf.nome,
      codigo_ibge: uf.codigo
    },

    pesquisa: "PAM",
    tabela_sidra: 5457,

    variavel: {
      codigo: r.D2C,
      nome: r.D2N
    },

    periodo: r.D3N,

    produto: {
      codigo: r.D4C,
      nome: r.D4N
    },

    valor: normalizarValor(r.V),

    unidade: {
      codigo: r.MC,
      nome: r.MN
    },

    fonte: "IBGE/SIDRA - PAM tabela 5457",
    status: "REAL",
    simulation: false,
    coletado_em: new Date().toISOString()
  }));
}

async function consultarCentroOeste() {
  const resultado = {};

  for (const sigla of Object.keys(UFS)) {
    resultado[sigla] = await consultarUF(sigla);
  }

  return resultado;
}

function selecionarCulturas(dados, nomes = ["Soja", "Milho"]) {
  const desejadas = nomes.map(x => x.toLowerCase());

  return dados.filter(item => {
    const produto =
      String(item.produto?.nome || "").toLowerCase();

    return desejadas.some(nome =>
      produto.includes(nome)
    );
  });
}

module.exports = {
  UFS,
  consultarUF,
  consultarCentroOeste,
  selecionarCulturas
};
