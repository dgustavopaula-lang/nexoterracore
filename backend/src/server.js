const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const databaseConfigurado = Boolean(process.env.DATABASE_URL);

const pool = databaseConfigurado
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false
    })
  : null;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500"
  })
);
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", async (req, res) => {
  let banco = "não configurado";

  if (pool) {
    try {
      await pool.query("SELECT 1");
      banco = "conectado";
    } catch {
      banco = "erro de conexão";
    }
  }

  res.json({
    sistema: "NexoTerraCore",
    api: "online",
    banco,
    horario: new Date().toISOString()
  });
});




app.get("/api/maquinas", async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      erro: "Banco de dados ainda não configurado."
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, nome, modelo, numero_serie, horimetro,
              proxima_revisao, status, criado_em
       FROM maquinas
       ORDER BY criado_em DESC`
    );

    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível consultar as máquinas." });
  }
});

app.post("/api/maquinas", async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      erro: "Banco de dados ainda não configurado."
    });
  }

  const {
    nome,
    modelo = "",
    numeroSerie = "",
    horimetro = 0,
    proximaRevisao = 0,
    status = "Ativa"
  } = req.body;

  if (!nome || Number(horimetro) < 0 || Number(proximaRevisao) < 0) {
    return res.status(400).json({
      erro: "Informe um nome e valores válidos de horímetro."
    });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO maquinas
       (nome, modelo, numero_serie, horimetro, proxima_revisao, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        nome.trim(),
        modelo.trim(),
        numeroSerie.trim(),
        Number(horimetro),
        Number(proximaRevisao),
        status
      ]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível cadastrar a máquina." });
  }
});

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.listen(PORT, () => {
  console.log(`NexoTerraCore API: http://localhost:${PORT}`);
});
