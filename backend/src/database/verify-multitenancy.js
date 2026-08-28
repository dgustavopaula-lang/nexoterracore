const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

async function contar(sql, parametros = []) {
  const resultado = await pool.query(sql, parametros);
  return Number(resultado.rows[0].total);
}

async function verificar() {
  try {
    const migrationMultiempresa = await contar(
      "SELECT COUNT(*) AS total FROM schema_migrations WHERE versao = $1",
      ["001_multiempresa"]
    );
    const migrationAutenticacao = await contar(
      "SELECT COUNT(*) AS total FROM schema_migrations WHERE versao = $1",
      ["002_autenticacao_autorizacao"]
    );
    const fazendaInicial = await contar(
      "SELECT COUNT(*) AS total FROM fazendas WHERE codigo = $1 AND ativo = TRUE",
      ["fazenda-inicial"]
    );
    const maquinasOrfas = await contar(`
      SELECT COUNT(*) AS total
      FROM maquinas m
      LEFT JOIN fazendas f ON f.id = m.fazenda_id
      WHERE f.id IS NULL
    `);
    const financeiroOrfao = await contar(`
      SELECT COUNT(*) AS total
      FROM lancamentos_financeiros l
      LEFT JOIN fazendas f ON f.id = l.fazenda_id
      WHERE f.id IS NULL
    `);
    const vinculosInvalidos = await contar(`
      SELECT COUNT(*) AS total
      FROM usuarios_fazendas uf
      LEFT JOIN usuarios_organizacoes uo
        ON uo.usuario_id = uf.usuario_id
       AND uo.organizacao_id = uf.organizacao_id
      LEFT JOIN fazendas f
        ON f.id = uf.fazenda_id
       AND f.organizacao_id = uf.organizacao_id
      WHERE uo.usuario_id IS NULL OR f.id IS NULL
    `);
    const sessoesInvalidas = await contar(`
      SELECT COUNT(*) AS total
      FROM sessoes_usuario s
      LEFT JOIN usuarios_fazendas uf
        ON uf.usuario_id = s.usuario_id
       AND uf.organizacao_id = s.organizacao_id
       AND uf.fazenda_id = s.fazenda_id
      WHERE uf.usuario_id IS NULL
    `);

    const verificacoes = {
      migration_multiempresa_aplicada: migrationMultiempresa === 1,
      migration_autenticacao_aplicada: migrationAutenticacao === 1,
      fazenda_inicial_ativa: fazendaInicial === 1,
      maquinas_orfas: maquinasOrfas,
      financeiro_orfao: financeiroOrfao,
      vinculos_invalidos: vinculosInvalidos,
      sessoes_invalidas: sessoesInvalidas
    };

    const valido =
      verificacoes.migration_multiempresa_aplicada &&
      verificacoes.migration_autenticacao_aplicada &&
      verificacoes.fazenda_inicial_ativa &&
      maquinasOrfas === 0 &&
      financeiroOrfao === 0 &&
      vinculosInvalidos === 0 &&
      sessoesInvalidas === 0;

    console.log(JSON.stringify(verificacoes, null, 2));

    if (!valido) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

verificar().catch((erro) => {
  console.error(`Falha na verificação: ${erro.message}`);
  process.exit(1);
});
