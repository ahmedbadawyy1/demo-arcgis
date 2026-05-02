const cron = require("node-cron");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");
const { runIngestionCycle } = require("../pipeline");

function startScheduler() {
  cron.schedule(env.ingestCron, async () => {
    logger.info({ cron: env.ingestCron }, "scheduler tick");
    try {
      await runIngestionCycle();
    } catch (error) {
      logger.error({ err: error }, "scheduled ingestion failed");
    }
  });
}

module.exports = { startScheduler };
