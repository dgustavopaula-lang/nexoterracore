const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const origensPermitidas = (
  process.env.FRONTEND_ORIGIN ||
  "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501"
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

      const erro = new Error("Origem não permitida pelo CORS.");
      erro.status = 403;
      callback(erro);
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

function validarLancamentoFinanceiro(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { erro: "Envie os dados financeiros em um objeto JSON válido." };
  }

  const descricao =
    typeof body.descricao === "string" ? body.descricao.trim() : "";
  const categoria =
    typeof body.categoria === "string" ? body.categoria.trim() : "";
  const tipo = typeof body.tipo === "string" ? body.tipo.trim() : "";
  const observacao =
    typeof body.observacao === "string" ? body.observacao.trim() : "";
  const valor = Number(body.valor);

  if (!descricao || !categoria || !dataValida(body.data)) {
    return { erro: "Informe descrição, categoria e uma data válida." };
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return { erro: "O valor deve ser um número maior que zero." };
  }

  if (!['Receita', 'Despesa'].includes(tipo)) {
    return { erro: "O tipo deve ser Receita ou Despesa." };
  }

  if (descricao.length > 160 || categoria.length > 100) {
    return { erro: "Descrição ou categoria ultrapassa o tamanho permitido." };
  }

  return {
    dados: {
      descricao,
      categoria,
      valor,
      data: body.data,
      tipo,
      observacao
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

app.get("/api/financeiro/resumo", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'Receita'), 0) AS receitas,
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'Despesa'), 0) AS despesas,
        COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE -valor END), 0) AS saldo
      FROM lancamentos_financeiros
    `);

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível calcular o resumo financeiro." });
  }
});

app.get("/api/financeiro", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        descricao,
        categoria,
        valor,
        data_lancamento,
        tipo,
        observacao,
        criado_em,
        atualizado_em
      FROM lancamentos_financeiros
      ORDER BY data_lancamento DESC, criado_em DESC
    `);

    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível consultar os lançamentos financeiros." });
  }
});

app.get("/api/financeiro/:id", async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const resultado = await pool.query(
      "SELECT * FROM lancamentos_financeiros WHERE id = $1",
      [id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({ erro: "Lançamento não encontrado." });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível consultar o lançamento." });
  }
});

app.post("/api/financeiro", async (req, res) => {
  const validacao = validarLancamentoFinanceiro(req.body);

  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

  try {
    const resultado = await pool.query(
      `
        INSERT INTO lancamentos_financeiros (
          descricao,
          categoria,
          valor,
          data_lancamento,
          tipo,
          observacao
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        dados.descricao,
        dados.categoria,
        dados.valor,
        dados.data,
        dados.tipo,
        dados.observacao
      ]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível salvar o lançamento financeiro." });
  }
});

app.put("/api/financeiro/:id", async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  const validacao = validarLancamentoFinanceiro(req.body);

  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

  try {
    const resultado = await pool.query(
      `
        UPDATE lancamentos_financeiros
        SET
          descricao = $1,
          categoria = $2,
          valor = $3,
          data_lancamento = $4,
          tipo = $5,
          observacao = $6,
          atualizado_em = NOW()
        WHERE id = $7
        RETURNING *
      `,
      [
        dados.descricao,
        dados.categoria,
        dados.valor,
        dados.data,
        dados.tipo,
        dados.observacao,
        id
      ]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({ erro: "Lançamento não encontrado." });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível atualizar o lançamento financeiro." });
  }
});

app.delete("/api/financeiro/:id", async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const resultado = await pool.query(
      "DELETE FROM lancamentos_financeiros WHERE id = $1 RETURNING id",
      [id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({ erro: "Lançamento não encontrado." });
    }

    res.status(204).end();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível excluir o lançamento financeiro." });
  }
});

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((erro, req, res, next) => {
  if (res.headersSent) {
    return next(erro);
  }

  const status =
    erro.status === 403
      ? 403
      : erro.type === "entity.too.large"
        ? 413
        : erro instanceof SyntaxError && erro.status === 400 && "body" in erro
          ? 400
          : 500;

  if (status === 500) {
    console.error(erro);
  }

  const mensagens = {
    400: "Envie um objeto JSON válido.",
    403: "Origem não permitida pelo CORS.",
    413: "O corpo da requisição ultrapassa o limite permitido.",
    500: "Erro interno do servidor."
  };

  res.status(status).json({ erro: mensagens[status] });
});

app.listen(PORT, () => {
  console.log(`NexoTerraCore API: http://localhost:${PORT}`);
});
