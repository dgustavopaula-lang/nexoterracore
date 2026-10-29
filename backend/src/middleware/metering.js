"use strict";

/*
 * NexoTerraCore API Intelligence
 *
 * Mede chamadas autenticadas por:
 * - API Key B2B
 * - sessão de usuário
 * - agentes Turing / NTCoins
 *
 * Mantém compatibilidade com o nome histórico:
 * criarMeteringApiKey()
 */

function criarMeteringApiKey(pool) {

  return (req, res, next) => {

    /*
     * Só registra chamadas com contexto organizacional.
     * Rotas públicas permanecem fora deste middleware.
     */
    if (!req.auth?.organizacaoId) {
      return next();
    }

    const inicio = process.hrtime.bigint();

    res.on("finish", async () => {

      try {

        const fim = process.hrtime.bigint();

        const latenciaMs =
          Number((fim - inicio) / 1000000n);

        const apiKeyId =
          req.auth?.tipo === "api_key"
            ? req.auth.apiKeyId
            : null;

        const usuarioId =
          req.auth?.tipo === "api_key"
            ? null
            : req.auth?.usuarioId || null;

        const ntcoins = req.ntcoins || null;

        /*
         * ADMIN_ISENTO possui custo de catálogo,
         * mas não representa consumo efetivamente debitado.
         */
        const ntcoinsConsumidos =
          ntcoins?.cobrado
            ? Number(ntcoins.custo || 0)
            : 0;

        /*
         * O handler pode enriquecer a telemetria através
         * de res.locals.apiMetering.
         */
        const info =
          res.locals?.apiMetering || {};

        const agente =
          info.agente ||
          (
            req.path === "/api/assistente/perguntar"
              ? "Turing"
              : null
          );

        let fonteExterna =
          info.fonte_externa ||
          info.fonteExterna ||
          null;

        if (Array.isArray(fonteExterna)) {
          fonteExterna =
            fonteExterna.join(" | ");
        }

        if (fonteExterna) {
          fonteExterna =
            String(fonteExterna).slice(0, 120);
        }

        const tipoOperacao =
          info.tipo_operacao ||
          info.tipoOperacao ||
          (
            apiKeyId
              ? "API_KEY_REQUEST"
              : "SESSION_REQUEST"
          );

        const erro =
          res.statusCode >= 400
            ? (
                info.erro ||
                `HTTP_${res.statusCode}`
              )
            : null;

        const contexto = {
          ...(info.contexto || {}),

          auth_tipo:
            req.auth?.tipo === "api_key"
              ? "api_key"
              : "sessao",

          usuario_id: usuarioId,

          fazenda_id:
            req.auth?.fazendaId || null,

          ntcoins_codigo:
            ntcoins?.codigo || null,

          ntcoins_cobrado:
            Boolean(ntcoins?.cobrado),

          ntcoins_isento:
            Boolean(ntcoins?.isento)
        };

        await pool.query(
          `
            INSERT INTO api_usage (
              organizacao_id,
              api_key_id,
              usuario_id,
              metodo,
              rota,
              status_http,
              latencia_ms,
              agente,
              fonte_externa,
              ntcoins_consumidos,
              tipo_operacao,
              erro,
              contexto
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,$7,
              $8,$9,$10,$11,$12,$13
            )
          `,
          [
            req.auth.organizacaoId,
            apiKeyId,
            usuarioId,
            req.method,
            req.path,
            res.statusCode,
            latenciaMs,
            agente,
            fonteExterna,
            ntcoinsConsumidos,
            tipoOperacao,
            erro,
            contexto
          ]
        );

      } catch (erro) {

        /*
         * Falha de telemetria jamais pode derrubar
         * a requisição principal.
         */
        console.error(
          "Erro ao registrar API Intelligence:",
          erro
        );

      }

    });

    next();
  };
}

module.exports = {
  criarMeteringApiKey
};
