const path = require("path");
const express = require("express");
const pinoHttp = require("pino-http");
const { env } = require("./config/env");
const { logger } = require("./utils/logger");
const { getLiveData, getHealth } = require("./controllers/live-data.controller");
const { getWindyEmbed } = require("./controllers/windy.controller");
const { startScheduler } = require("./jobs/scheduler");

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

const publicDir = path.join(__dirname, "..", "public");
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard", "index.html"));
});
app.get("/portal-windy", (req, res) => {
  res.sendFile(path.join(publicDir, "portal-windy.html"));
});
app.use(express.static(publicDir));

app.get("/health", getHealth);
app.get("/api/live-data", getLiveData);
app.get("/api/windy/embed", getWindyEmbed);

app.use((error, req, res, next) => {
  req.log.error({ err: error }, "request failed");
  res.status(500).json({ error: "internal_error", message: error.message });
  next();
});

if (require.main === module) {
  app.listen(env.port, () => {
    logger.info({ port: env.port }, "server started");
  });
  startScheduler();
}

module.exports = { app };
