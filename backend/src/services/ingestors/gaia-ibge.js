"use strict";

const https = require("https");

const REGIAO = {
  nome: "Centro-Oeste",
  ufs: {
    GO: "Goiás",
    MT: "Mato Grosso",
    MS: "Mato Grosso do Sul",
    DF: "Distrito Federal"
  }
};

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "NexoTerraCore/1.0",
        "Accept": "application/json"
      }
    }, res => {
      let body = "";

      res.on("data", chunk => body += chunk);

      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(
            new Error(`HTTP ${res.statusCode}`)
          );
        }

        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("Resposta JSON inválida"));
        }
      });
    }).on("error", reject);
  });
}

async function consultarMunicipiosGO() {
  const url =
    "https://servicodados.ibge.gov.br/api/v1/localidades/estados/GO/municipios";

  const dados = await getJson(url);

  return dados.map(m => ({
    id_ibge: m.id,
    municipio: m.nome,
    uf: "GO",
    regiao: "Centro-Oeste",
    fonte: "IBGE Localidades",
    status: "REAL",
    simulation: false,
    coletado_em: new Date().toISOString()
  }));
}

function contextoGaia() {
  return {
    agente: "gaia",
    coordenador: "turing",
    territorio: REGIAO,
    provedores: [
      {
        id: "ibge_localidades",
        instituicao: "IBGE",
        tipo: "territorial"
      },
      {
        id: "ibge_sidra_pam_5457",
        instituicao: "IBGE",
        tipo: "agropecuario",
        pesquisa: "PAM",
        tabela: 5457
      },
      {
        id: "inmet",
        instituicao: "INMET",
        tipo: "meteorologico"
      }
    ],
    politica: {
      aceitar_dado_sem_fonte: false,
      inventar_dados: false
    }
  };
}

module.exports = {
  consultarMunicipiosGO,
  contextoGaia
};
