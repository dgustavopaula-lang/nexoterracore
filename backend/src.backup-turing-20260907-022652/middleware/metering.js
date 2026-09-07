function criarMeteringApiKey(pool) {
  return (req, res, next) => {
    if (req.auth?.tipo !== "api_key") {
      return next();
    }

    res.on("finish", async () => {
      try {
        await pool.query(
          `
            INSERT INTO api_usage (
              organizacao_id,
              api_key_id,
              metodo,
              rota,
              status_http
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            req.auth.organizacaoId,
            req.auth.apiKeyId,
            req.method,
            req.path,
            res.statusCode
          ]
        );
      } catch (erro) {
        console.error("Erro ao registrar metering:", erro);
      }
    });

    next();
  };
}

module.exports = { criarMeteringApiKey };
