require("dotenv").config();

const { Pool } = require("pg");

const {
  carregarProjetoLoteamento,
  diagnosticarProjeto
} = require("./src/services/turing-loteamento");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

(async () => {
  const projeto =
    await carregarProjetoLoteamento(pool);

  const diagnostico =
    diagnosticarProjeto(projeto);

  console.log(
    "=== TURING LOTEAMENTO — FAZENDA CAMPANHA ==="
  );

  console.dir(diagnostico, {
    depth: null
  });

  await pool.end();

  console.log(
    "=== TURING LOTEAMENTO OPERACIONAL ==="
  );
})().catch(async erro => {
  console.error("ERRO:", erro.message);

  try {
    await pool.end();
  } catch {}

  process.exit(1);
});
