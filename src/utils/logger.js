const pino = require("pino");
const { env } = require("../config/env");

function redactSensitiveHeaders(headers) {
  if (!headers || typeof headers !== "object") return headers;
  const h = { ...headers };
  const redact = ["cookie", "authorization", "proxy-authorization"];
  for (const key of redact) {
    const k = Object.keys(h).find((x) => x.toLowerCase() === key);
    if (k && h[k]) h[k] = "[Redacted]";
  }
  return h;
}

function serializeReq(req) {
  if (!req || typeof req !== "object") return req;
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.params,
    headers: redactSensitiveHeaders(req.headers),
    remoteAddress: req.remoteAddress,
    remotePort: req.remotePort,
  };
}

const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  serializers: {
    req: serializeReq,
  },
});

module.exports = { logger };
