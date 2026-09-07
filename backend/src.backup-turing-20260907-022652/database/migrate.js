const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const DIRECAO = process.argv[2] || "up";
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../database/migrations");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

if (!['up', 'down'].includes(DIRECAO)) {
  console.error("Use: node src/database/migrate.js [up|down]");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

function listarMigrations(sufixo) {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((arquivo) => arquivo.endsWith(sufixo))
    .sort();
}

function versaoDoArquivo(arquivo) {
  return arquivo.replace(/\.(up|down)\.sql$/, "");
}

async function prepararControle() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      versao VARCHAR(160) PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function aplicar() {
  const aplicadas = new Set(
    (await pool.query("SELECT versao FROM schema_migrations")).rows.map(
      (linha) => linha.versao
    )
  );

  for (const arquivo of listarMigrations(".up.sql")) {
    const versao = versaoDoArquivo(arquivo);

    if (aplicadas.has(versao)) {
      continue;
    }

    const cliente = await pool.connect();

    try {
      await cliente.query("BEGIN");
      await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "nexoterracore-migrations"
      ]);
      await cliente.query(fs.readFileSync(path.join(MIGRATIONS_DIR, arquivo), "utf8"));
      await cliente.query(
        "INSERT INTO schema_migrations (versao) VALUES ($1)",
        [versao]
      );
      await cliente.query("COMMIT");
      console.log(`Migration aplicada: ${versao}`);
    } catch (erro) {
      await cliente.query("ROLLBACK");
      throw erro;
    } finally {
      cliente.release();
    }
  }
}

async function reverter() {
  const resultado = await pool.query(`
    SELECT versao
    FROM schema_migrations
    ORDER BY aplicada_em DESC, versao DESC
    LIMIT 1
  `);

  if (!resultado.rowCount) {
    console.log("Nenhuma migration para reverter.");
    return;
  }

  const versao = resultado.rows[0].versao;
  const arquivo = `${versao}.down.sql`;
  const caminho = path.join(MIGRATIONS_DIR, arquivo);

  if (!fs.existsSync(caminho)) {
    throw new Error(`Rollback não encontrado para ${versao}.`);
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "nexoterracore-migrations"
    ]);
    await cliente.query(fs.readFileSync(caminho, "utf8"));
    await cliente.query("DELETE FROM schema_migrations WHERE versao = $1", [
      versao
    ]);
    await cliente.query("COMMIT");
    console.log(`Migration revertida: ${versao}`);
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function executar() {
  try {
    await prepararControle();

    if (DIRECAO === "up") {
      await aplicar();
    } else {
      await reverter();
    }
  } finally {
    await pool.end();
  }
}

executar().catch((erro) => {
  console.error(`Falha na migration: ${erro.message}`);
  process.exit(1);
});
