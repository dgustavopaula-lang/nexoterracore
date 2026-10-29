const express = require("express");

function criarRotasEstacoes({ pool, autenticar }) {
  const router = express.Router();

  router.use(autenticar);

  router.get("/", async (req, res, next) => {
    try {
      if (
        !Number.isInteger(req.auth.organizacaoId) ||
        !Number.isInteger(req.auth.fazendaId)
      ) {
        return res.status(403).json({
          erro: "Contexto de organizacao/fazenda ausente."
        });
      }

      const resultado = await pool.query(
        `
          SELECT
            id,
            codigo,
            nome,
            tipo,
            descricao,
            latitude,
            longitude,
            ativo,
            criado_em,
            atualizado_em
          FROM estacoes
          WHERE organizacao_id = $1
            AND fazenda_id = $2
            AND ativo = TRUE
          ORDER BY nome, id
        `,
        [
          req.auth.organizacaoId,
          req.auth.fazendaId
        ]
      );

      res.json({
        ok: true,
        organizacao_id: req.auth.organizacaoId,
        fazenda_id: req.auth.fazendaId,
        total: resultado.rowCount,
        estacoes: resultado.rows
      });
    } catch (erro) {
      next(erro);
    }
  });

  router.get("/:id/medicoes", async (req, res, next) => {
    try {
      const estacaoId = Number(req.params.id);

      if (!Number.isInteger(estacaoId) || estacaoId <= 0) {
        return res.status(400).json({
          erro: "Estacao invalida."
        });
      }

      const resultado = await pool.query(
        `
          SELECT
            m.id,
            m.estacao_id,
            m.dispositivo_id,
            m.metrica,
            m.valor,
            m.unidade,
            m.origem,
            m.medido_em,
            m.dados_extras
          FROM medicoes_estacao m
          JOIN estacoes e
            ON e.id = m.estacao_id
          WHERE m.organizacao_id = $1
            AND m.fazenda_id = $2
            AND m.estacao_id = $3
            AND e.organizacao_id = $1
            AND e.fazenda_id = $2
          ORDER BY m.medido_em DESC, m.id DESC
          LIMIT 200
        `,
        [
          req.auth.organizacaoId,
          req.auth.fazendaId,
          estacaoId
        ]
      );

      res.json({
        ok: true,
        estacao_id: estacaoId,
        total: resultado.rowCount,
        medicoes: resultado.rows
      });
    } catch (erro) {
      next(erro);
    }
  });

  // =========================================================
  // SMART STATIONS - REGISTRO DE MEDICAO
  // Protegido por autenticar (router.use no topo).
  //
  // Idempotencia:
  // client_event_id identifica uma leitura criada no PWA.
  // Se a mesma leitura for reenviada, o Core devolve o
  // registro existente em vez de duplicar.
  // =========================================================
  router.post("/:id/medicoes", async (req, res, next) => {
    let cliente;

    try {
      const estacaoId = Number(req.params.id);

      if (!Number.isInteger(estacaoId) || estacaoId <= 0) {
        return res.status(400).json({
          erro: "Estacao invalida."
        });
      }

      // API Keys precisam possuir scope especifico de escrita.
      // Sessões autenticadas continuam sujeitas ao contexto
      // organizacao/fazenda já definido pelo Core.
      if (req.auth?.tipo === "api_key") {
        const scopes = Array.isArray(req.auth.scopes)
          ? req.auth.scopes
          : [];

        if (!scopes.includes("stations.write")) {
          return res.status(403).json({
            erro: "Scope insuficiente para registrar medicoes."
          });
        }
      }

      const corpo = req.body || {};

      const clientEventId =
        typeof corpo.client_event_id === "string"
          ? corpo.client_event_id.trim()
          : "";

      const dispositivoId = Number(corpo.dispositivo_id);

      const metrica =
        typeof corpo.metrica === "string"
          ? corpo.metrica.trim()
          : "";

      const unidade =
        typeof corpo.unidade === "string"
          ? corpo.unidade.trim()
          : "";

      const origem =
        typeof corpo.origem === "string"
          ? corpo.origem.trim()
          : "raiz_energia_pwa";

      const valor = Number(corpo.valor);

      if (
        !clientEventId ||
        clientEventId.length < 8 ||
        clientEventId.length > 160 ||
        !/^[A-Za-z0-9._:-]+$/.test(clientEventId)
      ) {
        return res.status(400).json({
          erro: "client_event_id invalido."
        });
      }

      if (
        !Number.isInteger(dispositivoId) ||
        dispositivoId <= 0
      ) {
        return res.status(400).json({
          erro: "Dispositivo invalido."
        });
      }

      if (!metrica || metrica.length > 80) {
        return res.status(400).json({
          erro: "Metrica invalida."
        });
      }

      if (!Number.isFinite(valor)) {
        return res.status(400).json({
          erro: "Valor invalido."
        });
      }

      if (!unidade || unidade.length > 30) {
        return res.status(400).json({
          erro: "Unidade invalida."
        });
      }

      if (origem.length > 100) {
        return res.status(400).json({
          erro: "Origem invalida."
        });
      }

      let medidoEm = new Date();

      if (corpo.medido_em) {
        medidoEm = new Date(corpo.medido_em);

        if (Number.isNaN(medidoEm.getTime())) {
          return res.status(400).json({
            erro: "Data da medicao invalida."
          });
        }
      }

      const organizacaoId = Number(req.auth?.organizacaoId);
      const fazendaSessao = Number(req.auth?.fazendaId);

      if (
        !Number.isInteger(organizacaoId) ||
        organizacaoId <= 0
      ) {
        return res.status(401).json({
          erro: "Contexto de organizacao invalido."
        });
      }

      cliente = await pool.connect();

      await cliente.query("BEGIN");

      // Serializa tentativas concorrentes do mesmo evento.
      await cliente.query(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        [clientEventId]
      );

      let estacao;

      if (
        Number.isInteger(fazendaSessao) &&
        fazendaSessao > 0
      ) {
        const resultadoEstacao = await cliente.query(
          `
            SELECT
              id,
              organizacao_id,
              fazenda_id,
              nome,
              ativo
            FROM estacoes
            WHERE id = $1
              AND organizacao_id = $2
              AND fazenda_id = $3
              AND ativo = TRUE
            LIMIT 1
          `,
          [
            estacaoId,
            organizacaoId,
            fazendaSessao
          ]
        );

        estacao = resultadoEstacao.rows[0];
      } else {
        // API Key é organizacional. A fazenda é derivada
        // da própria estação, nunca enviada pelo cliente.
        const resultadoEstacao = await cliente.query(
          `
            SELECT
              id,
              organizacao_id,
              fazenda_id,
              nome,
              ativo
            FROM estacoes
            WHERE id = $1
              AND organizacao_id = $2
              AND ativo = TRUE
            LIMIT 1
          `,
          [
            estacaoId,
            organizacaoId
          ]
        );

        estacao = resultadoEstacao.rows[0];
      }

      if (!estacao) {
        await cliente.query("ROLLBACK");

        return res.status(404).json({
          erro: "Estacao nao encontrada no contexto autorizado."
        });
      }

      const resultadoDispositivo = await cliente.query(
        `
          SELECT
            id,
            nome,
            ativo
          FROM dispositivos_estacao
          WHERE id = $1
            AND organizacao_id = $2
            AND fazenda_id = $3
            AND estacao_id = $4
            AND ativo = TRUE
          LIMIT 1
        `,
        [
          dispositivoId,
          organizacaoId,
          estacao.fazenda_id,
          estacaoId
        ]
      );

      if (!resultadoDispositivo.rowCount) {
        await cliente.query("ROLLBACK");

        return res.status(404).json({
          erro: "Dispositivo nao encontrado na estacao."
        });
      }

      const existente = await cliente.query(
        `
          SELECT
            id,
            estacao_id,
            dispositivo_id,
            metrica,
            valor,
            unidade,
            origem,
            medido_em,
            dados_extras
          FROM medicoes_estacao
          WHERE organizacao_id = $1
            AND fazenda_id = $2
            AND estacao_id = $3
            AND dados_extras->>'client_event_id' = $4
          ORDER BY id DESC
          LIMIT 1
        `,
        [
          organizacaoId,
          estacao.fazenda_id,
          estacaoId,
          clientEventId
        ]
      );

      if (existente.rowCount) {
        await cliente.query("COMMIT");

        return res.status(200).json({
          ok: true,
          duplicada: true,
          sincronizada: true,
          medicao: existente.rows[0]
        });
      }

      const extrasEntrada =
        corpo.dados_extras &&
        typeof corpo.dados_extras === "object" &&
        !Array.isArray(corpo.dados_extras)
          ? corpo.dados_extras
          : {};

      const dadosExtras = {
        ...extrasEntrada,
        client_event_id: clientEventId,
        origem_cliente: "raiz_energia_pwa"
      };

      const inserida = await cliente.query(
        `
          INSERT INTO medicoes_estacao (
            organizacao_id,
            fazenda_id,
            estacao_id,
            dispositivo_id,
            metrica,
            valor,
            unidade,
            origem,
            medido_em,
            dados_extras
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10::jsonb
          )
          RETURNING
            id,
            estacao_id,
            dispositivo_id,
            metrica,
            valor,
            unidade,
            origem,
            medido_em,
            dados_extras
        `,
        [
          organizacaoId,
          estacao.fazenda_id,
          estacaoId,
          dispositivoId,
          metrica,
          valor,
          unidade,
          origem,
          medidoEm,
          JSON.stringify(dadosExtras)
        ]
      );

      await cliente.query("COMMIT");

      return res.status(201).json({
        ok: true,
        duplicada: false,
        sincronizada: true,
        medicao: inserida.rows[0]
      });

    } catch (erro) {
      if (cliente) {
        try {
          await cliente.query("ROLLBACK");
        } catch {}
      }

      next(erro);

    } finally {
      if (cliente) {
        cliente.release();
      }
    }
  });


  return router;
}

module.exports = criarRotasEstacoes;
