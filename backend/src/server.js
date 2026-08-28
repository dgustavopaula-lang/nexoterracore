const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
const {
  verificarSenha,
  criarTokenSessao,
  hashToken
} = require("./security/credentials");
const { criarMiddlewaresAuth } = require("./middleware/auth");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_TTL_HOURS =
  process.env.SESSION_TTL_HOURS === undefined
    ? 8
    : Number(process.env.SESSION_TTL_HOURS);
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

if (
  !Number.isFinite(SESSION_TTL_HOURS) ||
  SESSION_TTL_HOURS <= 0 ||
  SESSION_TTL_HOURS > 24 * 30
) {
  console.error("SESSION_TTL_HOURS deve estar entre 0 e 720 horas.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});
const { autenticar, autorizar } = criarMiddlewaresAuth(pool);

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

async function comTransacao(callback) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");
    const resultado = await callback(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function registrarAuditoria(cliente, req, acao, recurso, registroId) {
  await cliente.query(
    `
      INSERT INTO auditoria_operacoes (
        usuario_id,
        organizacao_id,
        fazenda_id,
        acao,
        recurso,
        registro_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      req.auth.usuarioId,
      req.auth.organizacaoId,
      req.auth.fazendaId,
      acao,
      recurso,
      registroId
    ]
  );
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

app.post("/api/auth/login", async (req, res) => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  const fazendaInformada = req.body?.fazendaId;
  const fazendaId = fazendaInformada == null ? null : lerId(fazendaInformada);

  if (!email || email.length > 254 || !senha || (fazendaInformada != null && !fazendaId)) {
    return res.status(400).json({ erro: "Credenciais ou fazenda inválidas." });
  }

  try {
    const usuario = await pool.query(
      `
        SELECT id, nome, email, senha_hash, senha_salt
        FROM usuarios
        WHERE LOWER(BTRIM(email)) = $1
          AND ativo = TRUE
      `,
      [email]
    );

    const linhaUsuario = usuario.rows[0];
    const senhaValida = linhaUsuario
      ? await verificarSenha(senha, linhaUsuario.senha_hash, linhaUsuario.senha_salt)
      : await verificarSenha(senha, "00".repeat(64), "00".repeat(32));

    if (!linhaUsuario || !senhaValida) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const vinculos = await pool.query(
      `
        SELECT
          uf.organizacao_id,
          uf.fazenda_id,
          o.nome AS organizacao_nome,
          f.nome AS fazenda_nome,
          po.codigo AS perfil_organizacao,
          pf.codigo AS perfil_fazenda
        FROM usuarios_fazendas uf
        JOIN usuarios_organizacoes uo
          ON uo.usuario_id = uf.usuario_id
         AND uo.organizacao_id = uf.organizacao_id
         AND uo.ativo = TRUE
        JOIN organizacoes o
          ON o.id = uf.organizacao_id
         AND o.ativo = TRUE
        JOIN fazendas f
          ON f.id = uf.fazenda_id
         AND f.organizacao_id = uf.organizacao_id
         AND f.ativo = TRUE
        JOIN perfis_acesso po ON po.id = uo.perfil_id
        JOIN perfis_acesso pf ON pf.id = uf.perfil_id
        WHERE uf.usuario_id = $1
          AND uf.ativo = TRUE
          AND ($2::BIGINT IS NULL OR uf.fazenda_id = $2)
        ORDER BY uf.fazenda_id
      `,
      [linhaUsuario.id, fazendaId]
    );

    if (!vinculos.rowCount) {
      return res.status(403).json({ erro: "Usuário sem acesso à fazenda informada." });
    }

    if (fazendaId === null && vinculos.rowCount > 1) {
      return res.status(400).json({ erro: "Informe a fazenda para iniciar a sessão." });
    }

    const contexto = vinculos.rows[0];
    const token = criarTokenSessao();
    const expiraEm = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
    const sessao = await pool.query(
      `
        INSERT INTO sessoes_usuario (
          usuario_id,
          organizacao_id,
          fazenda_id,
          token_hash,
          expira_em
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, expira_em
      `,
      [
        linhaUsuario.id,
        contexto.organizacao_id,
        contexto.fazenda_id,
        hashToken(token),
        expiraEm
      ]
    );

    res.json({
      token,
      tipo: "Bearer",
      sessaoId: sessao.rows[0].id,
      expiraEm: sessao.rows[0].expira_em,
      usuario: {
        id: linhaUsuario.id,
        nome: linhaUsuario.nome,
        email: linhaUsuario.email
      },
      organizacao: {
        id: contexto.organizacao_id,
        nome: contexto.organizacao_nome,
        perfil: contexto.perfil_organizacao
      },
      fazenda: {
        id: contexto.fazenda_id,
        nome: contexto.fazenda_nome,
        perfil: contexto.perfil_fazenda
      }
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível iniciar a sessão." });
  }
});

app.get("/api/auth/me", autenticar, (req, res) => {
  res.json({
    usuario: {
      id: req.auth.usuarioId,
      nome: req.auth.usuarioNome,
      email: req.auth.usuarioEmail
    },
    organizacaoId: req.auth.organizacaoId,
    fazendaId: req.auth.fazendaId,
    perfis: req.auth.perfis
  });
});

app.post("/api/auth/logout", autenticar, async (req, res, next) => {
  try {
    await pool.query(
      `
        UPDATE sessoes_usuario
        SET revogada_em = NOW(), revogada_por_usuario_id = $1
        WHERE id = $2 AND revogada_em IS NULL
      `,
      [req.auth.usuarioId, req.auth.sessaoId]
    );
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

app.delete(
  "/api/auth/sessoes/:id",
  autenticar,
  autorizar("sessoes", "DELETE"),
  async (req, res, next) => {
    const id = lerId(req.params.id);

    if (!id) {
      return res.status(400).json({ erro: "Identificador inválido." });
    }

    try {
      const resultado = await pool.query(
        `
          UPDATE sessoes_usuario
          SET revogada_em = NOW(), revogada_por_usuario_id = $1
          WHERE id = $2
            AND organizacao_id = $3
            AND revogada_em IS NULL
          RETURNING id
        `,
        [req.auth.usuarioId, id, req.auth.organizacaoId]
      );

      if (!resultado.rowCount) {
        return res.status(404).json({ erro: "Sessão ativa não encontrada." });
      }

      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  }
);

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

app.get("/api/maquinas", autenticar, autorizar("maquinas", "GET"), async (req, res) => {
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
      WHERE fazenda_id = $1
      ORDER BY criado_em DESC
    `, [req.auth.fazendaId]);

    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Não foi possível consultar as máquinas."
    });
  }
});

app.get("/api/maquinas/:id", autenticar, autorizar("maquinas", "GET"), async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const resultado = await pool.query(
      "SELECT * FROM maquinas WHERE id = $1 AND fazenda_id = $2",
      [id, req.auth.fazendaId]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({ erro: "Registro não encontrado." });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível consultar a máquina." });
  }
});

app.post("/api/maquinas", autenticar, autorizar("maquinas", "POST"), async (req, res) => {
  const validacao = validarMaquina(req.body);

  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

  try {
    const maquina = await comTransacao(async (cliente) => {
      const resultado = await cliente.query(
        `
          INSERT INTO maquinas (
            fazenda_id,
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
            criado_por_usuario_id,
            atualizado_por_usuario_id
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
          RETURNING *
        `,
        [
          req.auth.fazendaId,
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
          req.auth.usuarioId
        ]
      );
      await registrarAuditoria(cliente, req, "CREATE", "maquinas", resultado.rows[0].id);
      return resultado.rows[0];
    });

    res.status(201).json(maquina);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Não foi possível salvar o registro da máquina."
    });
  }
});

app.put("/api/maquinas/:id", autenticar, autorizar("maquinas", "PUT"), async (req, res) => {
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
    const maquina = await comTransacao(async (cliente) => {
      const resultado = await cliente.query(
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
            atualizado_por_usuario_id = $11,
            atualizado_em = NOW()
          WHERE id = $12 AND fazenda_id = $13
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
          req.auth.usuarioId,
          id,
          req.auth.fazendaId
        ]
      );

      if (!resultado.rowCount) {
        return null;
      }

      await registrarAuditoria(cliente, req, "UPDATE", "maquinas", id);
      return resultado.rows[0];
    });

    if (!maquina) {
      return res.status(404).json({ erro: "Registro não encontrado." });
    }

    res.json(maquina);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível atualizar a máquina." });
  }
});

app.delete("/api/maquinas/:id", autenticar, autorizar("maquinas", "DELETE"), async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const removida = await comTransacao(async (cliente) => {
      const resultado = await cliente.query(
        "DELETE FROM maquinas WHERE id = $1 AND fazenda_id = $2 RETURNING id",
        [id, req.auth.fazendaId]
      );

      if (!resultado.rowCount) {
        return false;
      }

      await registrarAuditoria(cliente, req, "DELETE", "maquinas", id);
      return true;
    });

    if (!removida) {
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

app.get("/api/financeiro/resumo", autenticar, autorizar("financeiro", "GET"), async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'Receita'), 0) AS receitas,
        COALESCE(SUM(valor) FILTER (WHERE tipo = 'Despesa'), 0) AS despesas,
        COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE -valor END), 0) AS saldo
      FROM lancamentos_financeiros
      WHERE fazenda_id = $1
    `, [req.auth.fazendaId]);

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível calcular o resumo financeiro." });
  }
});

app.get("/api/financeiro", autenticar, autorizar("financeiro", "GET"), async (req, res) => {
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
      WHERE fazenda_id = $1
      ORDER BY data_lancamento DESC, criado_em DESC
    `, [req.auth.fazendaId]);

    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível consultar os lançamentos financeiros." });
  }
});

app.get("/api/financeiro/:id", autenticar, autorizar("financeiro", "GET"), async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const resultado = await pool.query(
      "SELECT * FROM lancamentos_financeiros WHERE id = $1 AND fazenda_id = $2",
      [id, req.auth.fazendaId]
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

app.post("/api/financeiro", autenticar, autorizar("financeiro", "POST"), async (req, res) => {
  const validacao = validarLancamentoFinanceiro(req.body);

  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

  try {
    const lancamento = await comTransacao(async (cliente) => {
      const resultado = await cliente.query(
        `
          INSERT INTO lancamentos_financeiros (
            fazenda_id,
            descricao,
            categoria,
            valor,
            data_lancamento,
            tipo,
            observacao,
            criado_por_usuario_id,
            atualizado_por_usuario_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
          RETURNING *
        `,
        [
          req.auth.fazendaId,
          dados.descricao,
          dados.categoria,
          dados.valor,
          dados.data,
          dados.tipo,
          dados.observacao,
          req.auth.usuarioId
        ]
      );
      await registrarAuditoria(
        cliente,
        req,
        "CREATE",
        "lancamentos_financeiros",
        resultado.rows[0].id
      );
      return resultado.rows[0];
    });

    res.status(201).json(lancamento);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível salvar o lançamento financeiro." });
  }
});

app.put("/api/financeiro/:id", autenticar, autorizar("financeiro", "PUT"), async (req, res) => {
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
    const lancamento = await comTransacao(async (cliente) => {
      const resultado = await cliente.query(
        `
          UPDATE lancamentos_financeiros
          SET
            descricao = $1,
            categoria = $2,
            valor = $3,
            data_lancamento = $4,
            tipo = $5,
            observacao = $6,
            atualizado_por_usuario_id = $7,
            atualizado_em = NOW()
          WHERE id = $8 AND fazenda_id = $9
          RETURNING *
        `,
        [
          dados.descricao,
          dados.categoria,
          dados.valor,
          dados.data,
          dados.tipo,
          dados.observacao,
          req.auth.usuarioId,
          id,
          req.auth.fazendaId
        ]
      );

      if (!resultado.rowCount) {
        return null;
      }

      await registrarAuditoria(
        cliente,
        req,
        "UPDATE",
        "lancamentos_financeiros",
        id
      );
      return resultado.rows[0];
    });

    if (!lancamento) {
      return res.status(404).json({ erro: "Lançamento não encontrado." });
    }

    res.json(lancamento);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Não foi possível atualizar o lançamento financeiro." });
  }
});

app.delete("/api/financeiro/:id", autenticar, autorizar("financeiro", "DELETE"), async (req, res) => {
  const id = lerId(req.params.id);

  if (!id) {
    return res.status(400).json({ erro: "Identificador inválido." });
  }

  try {
    const removido = await comTransacao(async (cliente) => {
      const resultado = await cliente.query(
        "DELETE FROM lancamentos_financeiros WHERE id = $1 AND fazenda_id = $2 RETURNING id",
        [id, req.auth.fazendaId]
      );

      if (!resultado.rowCount) {
        return false;
      }

      await registrarAuditoria(
        cliente,
        req,
        "DELETE",
        "lancamentos_financeiros",
        id
      );
      return true;
    });

    if (!removido) {
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

async function iniciarServidor() {
  const migration = await pool.query(
    "SELECT 1 FROM schema_migrations WHERE versao = $1",
    ["002_autenticacao_autorizacao"]
  );

  if (!migration.rowCount) {
    throw new Error("A migration de autenticação ainda não foi aplicada.");
  }

  app.listen(PORT, () => {
    console.log(`NexoTerraCore API: http://localhost:${PORT}`);
  });
}

iniciarServidor().catch(async (erro) => {
  console.error(`Não foi possível iniciar a API: ${erro.message}`);
  await pool.end();
  process.exit(1);
});
