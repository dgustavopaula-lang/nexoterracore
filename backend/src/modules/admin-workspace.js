const express = require("express");

function texto(valor, limite = 1000) {
  const s = String(valor ?? "").trim();
  return s ? s.slice(0, limite) : null;
}

function moduloValido(valor) {
  const modulo = String(valor || "").trim().toLowerCase();
  return /^[a-z0-9-]{2,80}$/.test(modulo) ? modulo : null;
}

async function garantirEstruturaAdminWorkspace(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS console_admin_modulos (
      organizacao_id BIGINT NOT NULL,
      usuario_id BIGINT NOT NULL,
      modulo VARCHAR(80) NOT NULL,
      dados JSONB NOT NULL DEFAULT '{}'::jsonb,
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (organizacao_id, usuario_id, modulo)
    );

    CREATE TABLE IF NOT EXISTS console_admin_contatos (
      id BIGSERIAL PRIMARY KEY,
      organizacao_id BIGINT NOT NULL,
      usuario_id BIGINT NOT NULL,
      empresa VARCHAR(180) NOT NULL,
      responsavel VARCHAR(180),
      email VARCHAR(255),
      whatsapp VARCHAR(80),
      projeto VARCHAR(180),
      mensagem TEXT,
      status VARCHAR(40) NOT NULL DEFAULT 'novo',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_console_admin_contatos_owner
      ON console_admin_contatos (organizacao_id, usuario_id, atualizado_em DESC);
  `);
}

function criarRouterAdminWorkspace({ pool, autenticar }) {
  const router = express.Router();
  router.use(autenticar);

  router.use((req, res, next) => {
    if (!Array.isArray(req.auth?.perfis) || !req.auth.perfis.includes("proprietario")) {
      return res.status(403).json({ erro: "Área exclusiva do proprietário." });
    }
    next();
  });

  router.get("/modulos/:modulo", async (req, res, next) => {
    try {
      const modulo = moduloValido(req.params.modulo);
      if (!modulo) return res.status(400).json({ erro: "Módulo inválido." });

      const r = await pool.query(
        `SELECT modulo, dados, atualizado_em AS "atualizadoEm"
         FROM console_admin_modulos
         WHERE organizacao_id=$1 AND usuario_id=$2 AND modulo=$3`,
        [req.auth.organizacaoId, req.auth.usuarioId, modulo]
      );

      res.json(r.rows[0] || { modulo, dados: {}, atualizadoEm: null });
    } catch (e) { next(e); }
  });

  router.put("/modulos/:modulo", async (req, res, next) => {
    try {
      const modulo = moduloValido(req.params.modulo);
      if (!modulo) return res.status(400).json({ erro: "Módulo inválido." });
      const dados = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};

      const r = await pool.query(
        `INSERT INTO console_admin_modulos (organizacao_id, usuario_id, modulo, dados)
         VALUES ($1,$2,$3,$4::jsonb)
         ON CONFLICT (organizacao_id, usuario_id, modulo)
         DO UPDATE SET dados=EXCLUDED.dados, atualizado_em=NOW()
         RETURNING modulo, dados, atualizado_em AS "atualizadoEm"`,
        [req.auth.organizacaoId, req.auth.usuarioId, modulo, JSON.stringify(dados)]
      );

      res.json(r.rows[0]);
    } catch (e) { next(e); }
  });

  router.get("/contatos", async (req, res, next) => {
    try {
      const r = await pool.query(
        `SELECT id, empresa, responsavel, email, whatsapp, projeto, mensagem, status,
                criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"
         FROM console_admin_contatos
         WHERE organizacao_id=$1 AND usuario_id=$2
         ORDER BY atualizado_em DESC, id DESC`,
        [req.auth.organizacaoId, req.auth.usuarioId]
      );
      res.json(r.rows);
    } catch (e) { next(e); }
  });

  router.post("/contatos", async (req, res, next) => {
    try {
      const empresa = texto(req.body.empresa, 180);
      if (!empresa) return res.status(400).json({ erro: "Empresa é obrigatória." });

      const r = await pool.query(
        `INSERT INTO console_admin_contatos
         (organizacao_id, usuario_id, empresa, responsavel, email, whatsapp, projeto, mensagem, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          req.auth.organizacaoId,
          req.auth.usuarioId,
          empresa,
          texto(req.body.responsavel, 180),
          texto(req.body.email, 255),
          texto(req.body.whatsapp, 80),
          texto(req.body.projeto, 180),
          texto(req.body.mensagem, 5000),
          texto(req.body.status, 40) || "novo"
        ]
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { next(e); }
  });

  router.put("/contatos/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const empresa = texto(req.body.empresa, 180);
      if (!Number.isSafeInteger(id) || id <= 0 || !empresa) {
        return res.status(400).json({ erro: "Dados inválidos." });
      }

      const r = await pool.query(
        `UPDATE console_admin_contatos
         SET empresa=$1, responsavel=$2, email=$3, whatsapp=$4,
             projeto=$5, mensagem=$6, status=$7, atualizado_em=NOW()
         WHERE id=$8 AND organizacao_id=$9 AND usuario_id=$10
         RETURNING *`,
        [
          empresa,
          texto(req.body.responsavel, 180),
          texto(req.body.email, 255),
          texto(req.body.whatsapp, 80),
          texto(req.body.projeto, 180),
          texto(req.body.mensagem, 5000),
          texto(req.body.status, 40) || "novo",
          id,
          req.auth.organizacaoId,
          req.auth.usuarioId
        ]
      );

      if (!r.rowCount) return res.status(404).json({ erro: "Contato não encontrado." });
      res.json(r.rows[0]);
    } catch (e) { next(e); }
  });

  router.delete("/contatos/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ erro: "ID inválido." });

      const r = await pool.query(
        `DELETE FROM console_admin_contatos
         WHERE id=$1 AND organizacao_id=$2 AND usuario_id=$3
         RETURNING id`,
        [id, req.auth.organizacaoId, req.auth.usuarioId]
      );

      if (!r.rowCount) return res.status(404).json({ erro: "Contato não encontrado." });
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = {
  garantirEstruturaAdminWorkspace,
  criarRouterAdminWorkspace
};
