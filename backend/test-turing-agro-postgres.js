require("dotenv").config();

const { Pool } = require("pg");
const {
  analisarFazendaDoBanco
} = require("./src/services/turing-agro-operacional");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

(async () => {
  const fazenda = await pool.query(`
    SELECT id, organizacao_id, nome
    FROM fazendas
    WHERE codigo = 'CAMPANHA-001'
    LIMIT 1
  `);

  if (!fazenda.rowCount) {
    throw new Error("Fazenda Campanha não encontrada.");
  }

  const f = fazenda.rows[0];

  const resultado = await analisarFazendaDoBanco(pool, {
    organizacaoId: Number(f.organizacao_id),
    fazendaId: Number(f.id)
  });

  console.log("=== TURING AGRO — POSTGRESQL REAL ===");
  console.log(JSON.stringify(resultado, null, 2));

  await pool.end();
})().catch(async erro => {
  console.error("ERRO:", erro.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
