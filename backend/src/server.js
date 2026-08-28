const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const origensPermitidas = (
  process.env.FRONTEND_ORIGIN ||
  "http://127.0.0.1:5500,http://localhost:5500"
)
  .split(",")
  .map((origem) => origem.trim())
  .filter(Boolean);

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
    origin(origem, callback) {
      if (!origem || origensPermitidas.includes(origem)) {
        return callback(null, true);
      }

      callback(new Error("Origem não permitida pelo CORS."));
    }
  })
);

app.use(express.json({ limit: "200kb" }));

function lerId(valor) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function dataValida(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function validarMaquina(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { erro: "Envie os dados da máquina em um objeto JSON válido." };
  }

  const maquina = typeof body.maquina === "string" ? body.maquina.trim() : "";
  const modelo = typeof body.modelo === "string" ? body.modelo.trim() : "";
  const numeroSerie =
    typeof body.numeroSerie === "string" ? body.numeroSerie.trim() : "";
  const operacao =
    typeof body.operacao === "string" ? body.operacao.trim() : "";
  const observacao =
    typeof body.observacao === "string" ? body.observacao.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "Ativa";
  const horimetro = Number(body.horimetro);
  const proximaRevisao = Number(body.proximaRevisao);
  const combustivel = Number(body.combustivel);

  if (!maquina || !operacao || !dataValida(body.data)) {
    return { erro: "Informe máquina, operação e uma data válida." };
  }

  if (
    body.horimetro === "" ||
    body.horimetro == null ||
    body.proximaRevisao === "" ||
    body.proximaRevisao == null ||
    body.combustivel === "" ||
    body.combustivel == null ||
    !Number.isFinite(horimetro) ||
    !Number.isFinite(proximaRevisao) ||
    !Number.isFinite(combustivel) ||
    horimetro < 0 ||
    proximaRevisao < 0 ||
    combustivel < 0
  ) {
    return { erro: "Horímetro, próxima revisão e combustível devem ser números não negativos." };
  }

  if (
    maquina.length > 120 ||
    modelo.length > 120 ||
    numeroSerie.length > 120 ||
    operacao.length > 80 ||
    status.length > 30
  ) {
    return { erro: "Um ou mais campos ultrapassam o tamanho permitido." };
  }

  if (!status) {
    return { erro: "Informe um status válido." };
  }

  return {
    dados: {
      maquina,
      modelo,
      numeroSerie,
      operacao,
      horimetro,
      proximaRevisao,
      combustivel,
      data: body.data,
      observacao,
      status
    }
  };
}

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

app.get("/api/maquinas/:id", async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const resultado = await pool.query("SELECT * FROM maquinas WHERE id = $1", [id]);

    if (!resultado.rowCount) {
      return res.status(404).json({ erro: "Registro não encontrado." });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível consultar a máquina." });
  }
});

app.post("/api/maquinas", async (req, res) => {
  const validacao = validarMaquina(req.body);

  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

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
        dados.maquina,
        dados.modelo,
        dados.numeroSerie,
        dados.operacao,
        dados.horimetro,
        dados.proximaRevisao,
        dados.combustivel,
        dados.data,
        dados.observacao,
        dados.status
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

app.put("/api/maquinas/:id", async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  const validacao = validarMaquina(req.body);

  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

  try {
    const resultado = await pool.query(
      `
        UPDATE maquinas
        SET
          nome = $1,
          modelo = $2,
          numero_serie = $3,
          operacao = $4,
          horimetro = $5,
          proxima_revisao = $6,
          combustivel = $7,
          data_operacao = $8,
          observacao = $9,
          status = $10,
          atualizado_em = NOW()
        WHERE id = $11
        RETURNING *
      `,
      [
        dados.maquina,
        dados.modelo,
        dados.numeroSerie,
        dados.operacao,
        dados.horimetro,
        dados.proximaRevisao,
        dados.combustivel,
        dados.data,
        dados.observacao,
        dados.status,
        id
      ]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({ erro: "Registro não encontrado." });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível atualizar a máquina." });
  }
});

app.delete("/api/maquinas/:id", async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
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
