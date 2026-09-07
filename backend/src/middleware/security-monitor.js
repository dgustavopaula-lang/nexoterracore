const crypto = require("crypto");

const buckets = new Map();

function ipCliente(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 100);
}

function criarLimitador({
  nome,
  janelaMs,
  max,
  chave = (req) => ipCliente(req)
}) {
  return (req, res, next) => {
    const agora = Date.now();
    const id = `${nome}:${chave(req)}`;

    let estado = buckets.get(id);

    if (!estado || agora >= estado.resetEm) {
      estado = {
        total: 0,
        resetEm: agora + janelaMs
      };
    }

    estado.total += 1;
    buckets.set(id, estado);

    const restante = Math.max(0, max - estado.total);

    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(restante));
    res.set(
      "X-RateLimit-Reset",
      String(Math.ceil(estado.resetEm / 1000))
    );

    if (estado.total > max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((estado.resetEm - agora) / 1000)
      );

      res.set("Retry-After", String(retryAfter));

      console.warn(
        JSON.stringify({
          nivel: "security",
          evento: "rate_limit",
          limitador: nome,
          ip: ipCliente(req),
          metodo: req.method,
          rota: req.path,
          horario: new Date().toISOString()
        })
      );

      return res.status(429).json({
        erro: "Muitas requisições. Aguarde antes de tentar novamente."
      });
    }

    next();
  };
}

function monitorarSeguranca(req, res, next) {
  const recebido = req.get("x-request-id") || "";

  const requestId =
    /^[A-Za-z0-9._-]{8,80}$/.test(recebido)
      ? recebido
      : crypto.randomUUID();

  req.requestId = requestId;

  res.set("X-Request-Id", requestId);
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  res.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  const inicio = Date.now();

  res.on("finish", () => {
    const status = res.statusCode;

    if (
      status === 401 ||
      status === 403 ||
      status === 429 ||
      status >= 500
    ) {
      console.warn(
        JSON.stringify({
          nivel: "security",
          evento: "http_anomaly",
          requestId,
          status,
          metodo: req.method,
          rota: req.path,
          ip: ipCliente(req),
          duracaoMs: Date.now() - inicio,
          horario: new Date().toISOString()
        })
      );
    }
  });

  next();
}

function exigirJson(req, res, next) {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  const possuiCorpo =
    Number(req.get("content-length") || 0) > 0 ||
    Boolean(req.get("transfer-encoding"));

  if (possuiCorpo && !req.is("application/json")) {
    return res.status(415).json({
      erro: "Content-Type deve ser application/json."
    });
  }

  next();
}

const limpeza = setInterval(() => {
  const agora = Date.now();

  for (const [chave, estado] of buckets) {
    if (agora >= estado.resetEm) {
      buckets.delete(chave);
    }
  }
}, 5 * 60 * 1000);

limpeza.unref();

module.exports = {
  criarLimitador,
  monitorarSeguranca,
  exigirJson
};
