const express = require("express");
const {
  garantirEstruturaAdminWorkspace,
  criarRouterAdminWorkspace
} = require("./admin-workspace");

function validarLancamento(body) {
  const tipo = String(body.tipo || "").trim().toLowerCase();
  const descricao = String(body.descricao || "").trim();
  const valor = Number(body.valor);
  const status = String(body.status || "aberto").trim().toLowerCase();

  if (!["receita", "despesa"].includes(tipo)) {
    return { erro: "Tipo deve ser receita ou despesa." };
  }

  if (!descricao) {
    return { erro: "Informe a descrição." };
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return { erro: "Informe um valor positivo." };
  }

  if (!["aberto", "pago", "recebido", "vencido", "cancelado"].includes(status)) {
    return { erro: "Status inválido." };
  }

  return {
    dados: {
      tipo,
      descricao,
      categoria: String(body.categoria || "Geral").trim(),
      centroCusto: String(body.centroCusto || "Administrativo").trim(),
      valor,
      vencimento: body.vencimento || null,
      pagamento: body.pagamento || null,
      status,
      observacao: String(body.observacao || "").trim()
    }
  };
}

async function garantirEstruturaFinanceira(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
      id BIGSERIAL PRIMARY KEY,
      organizacao_id BIGINT NOT NULL,
      fazenda_id BIGINT,
      tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
      descricao VARCHAR(180) NOT NULL,
      categoria VARCHAR(100) NOT NULL DEFAULT 'Geral',
      centro_custo VARCHAR(100) NOT NULL DEFAULT 'Administrativo',
      valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
      vencimento DATE,
      pagamento DATE,
      status VARCHAR(12) NOT NULL DEFAULT 'aberto',
      observacao TEXT NOT NULL DEFAULT '',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_financeiro_organizacao
    ON financeiro_lancamentos (organizacao_id, vencimento DESC, id DESC)
  `);

  await garantirEstruturaAdminWorkspace(pool);
}

function criarRouterFinanceiro({
  pool,
  autenticar,
  autorizar,
  comTransacao,
  registrarAuditoria,
  lerId
}) {
  const router = express.Router();

  router.use(
    "/admin-workspace",
    criarRouterAdminWorkspace({ pool, autenticar, autorizar })
  );

  router.use(autenticar);

  router.get("/resumo", async (req, res, next) => {
    try {
      const resultado = await pool.query(
        `
          SELECT
            COALESCE(SUM(valor) FILTER (
              WHERE tipo = 'receita' AND status <> 'cancelado'
            ), 0)::numeric AS receitas,
            COALESCE(SUM(valor) FILTER (
              WHERE tipo = 'despesa' AND status <> 'cancelado'
            ), 0)::numeric AS despesas
          FROM financeiro_lancamentos
          WHERE organizacao_id = $1
        `,
        [req.auth.organizacaoId]
      );

      const receitas = Number(resultado.rows[0].receitas);
      const despesas = Number(resultado.rows[0].despesas);

      res.json({
        receitas,
        despesas,
        saldo: receitas - despesas
      });
    } catch (erro) {
      next(erro);
    }
  });

  router.get("/lancamentos", async (req, res, next) => {
    try {
      const resultado = await pool.query(
        `
          SELECT
            id, tipo, descricao, categoria,
            centro_custo AS "centroCusto",
            valor::numeric, vencimento, pagamento,
            status, observacao, criado_em AS "criadoEm"
          FROM financeiro_lancamentos
          WHERE organizacao_id = $1
          ORDER BY vencimento DESC NULLS LAST, id DESC
        `,
        [req.auth.organizacaoId]
      );

      res.json(resultado.rows);
    } catch (erro) {
      next(erro);
    }
  });

  router.post("/lancamentos", async (req, res, next) => {
    const validacao = validarLancamento(req.body);

    if (validacao.erro) {
      return res.status(400).json({ erro: validacao.erro });
    }

    try {
      const registro = await comTransacao(async (cliente) => {
        const d = validacao.dados;
        const resultado = await cliente.query(
          `
            INSERT INTO financeiro_lancamentos (
              organizacao_id, fazenda_id, tipo, descricao,
              categoria, centro_custo, valor, vencimento,
              pagamento, status, observacao
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING id, tipo, descricao, valor::numeric, status
          `,
          [
            req.auth.organizacaoId,
            req.auth.fazendaId || null,
            d.tipo,
            d.descricao,
            d.categoria,
            d.centroCusto,
            d.valor,
            d.vencimento,
            d.pagamento,
            d.status,
            d.observacao
          ]
        );

        await registrarAuditoria(
          cliente,
          req,
          "CRIAR",
          "financeiro_lancamentos",
          resultado.rows[0].id
        );

        return resultado.rows[0];
      });

      res.status(201).json(registro);
    } catch (erro) {
      next(erro);
    }
  });

  router.patch("/lancamentos/:id/status", async (req, res, next) => {
    const id = lerId(req.params.id);
    const status = String(req.body.status || "").trim().toLowerCase();

    if (!id || !["aberto", "pago", "recebido", "vencido", "cancelado"].includes(status)) {
      return res.status(400).json({ erro: "ID ou status inválido." });
    }

    try {
      const registro = await comTransacao(async (cliente) => {
        const resultado = await cliente.query(
          `
            UPDATE financeiro_lancamentos
            SET status = $1,
                pagamento = CASE
                  WHEN $1 IN ('pago', 'recebido') THEN CURRENT_DATE
                  ELSE pagamento
                END,
                atualizado_em = NOW()
            WHERE id = $2 AND organizacao_id = $3
            RETURNING id, tipo, descricao, valor::numeric, status
          `,
          [status, id, req.auth.organizacaoId]
        );

        if (!resultado.rowCount) return null;

        await registrarAuditoria(
          cliente,
          req,
          "ATUALIZAR_STATUS",
          "financeiro_lancamentos",
          id
        );

        return resultado.rows[0];
      });

      if (!registro) {
        return res.status(404).json({ erro: "Lançamento não encontrado." });
      }

      res.json(registro);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = {
  garantirEstruturaFinanceira,
  criarRouterFinanceiro
};
