const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500"
  })
);

app.use(express.json({ limit: "200kb" }));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      sistema: "NexoTerraCore",
      api: "online",
      banco: "conectado",
      horario: new Date().toISOString()
    });
  } catch (erro) {
    console.error(erro);

    res.status(503).json({
      sistema: "NexoTerraCore",
      api: "online",
      banco: "erro de conexão"
    });
  }
});

app.get("/api/maquinas", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        nome,
        modelo,
        numero_serie,
        operacao,
        horimetro,
        proxima_revisao,
        combustivel,
        data_operacao,
        observacao,
        status,
        criado_em
      FROM maquinas
      ORDER BY criado_em DESC
    `);

    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Não foi possível consultar as máquinas."
    });
  }
});

app.post("/api/maquinas", async (req, res) => {
  const {
    maquina,
    modelo = "",
    numeroSerie = "",
    operacao,
    horimetro,
    proximaRevisao,
    combustivel,
    data,
    observacao = "",
    status = "Ativa"
  } = req.body;

  if (
    !maquina ||
    !operacao ||
    !data ||
    Number(horimetro) < 0 ||
    Number(proximaRevisao) < 0 ||
    Number(combustivel) < 0
  ) {
    return res.status(400).json({
      erro: "Preencha os dados obrigatórios com valores válidos."
    });
  }

  try {
    const resultado = await pool.query(
      `
        INSERT INTO maquinas (
          nome,
          modelo,
          numero_serie,
          operacao,
          horimetro,
          proxima_revisao,
          combustivel,
          data_operacao,
          observacao,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `,
      [
        maquina.trim(),
        modelo.trim(),
        numeroSerie.trim(),
        operacao,
        Number(horimetro),
        Number(proximaRevisao),
        Number(combustivel),
        data,
        observacao.trim(),
        status
      ]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Não foi possível salvar o registro da máquina."
    });
  }
});

app.delete("/api/maquinas/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const resultado = await pool.query(
      "DELETE FROM maquinas WHERE id = $1 RETURNING id",
      [id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        erro: "Registro não encontrado."
      });
    }

    res.status(204).end();
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Não foi possível excluir o registro."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.listen(PORT, () => {
  console.log(`NexoTerraCore API: http://localhost:${PORT}`);
});
