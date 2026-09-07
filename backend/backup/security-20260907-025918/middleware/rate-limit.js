const limites = new Map();

function criarRateLimitApiKey({ janelaMs = 60_000, max = 60 } = {}) {
  return (req, res, next) => {
    if (req.auth?.tipo !== "api_key") {
      return next();
    }

    const chave = req.auth.apiKeyId;
    const agora = Date.now();

    let estado = limites.get(chave);

    if (!estado || agora >= estado.resetEm) {
      estado = {
        total: 0,
        resetEm: agora + janelaMs
      };
    }

    estado.total += 1;
    limites.set(chave, estado);

    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - estado.total)));
    res.set("X-RateLimit-Reset", String(Math.ceil(estado.resetEm / 1000)));

    if (estado.total > max) {
      return res.status(429).json({
        erro: "Limite de requisições excedido."
      });
    }

    next();
  };
}

module.exports = { criarRateLimitApiKey };
