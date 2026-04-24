import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { ensureDbReady } from "./db/client.js";
import { agentsRouter } from "./routes/agents.js";
import { auditRouter } from "./routes/audit.js";
import { incidentsRouter } from "./routes/incidents.js";
import { killSwitchRouter } from "./routes/kill_switch.js";
import { metricsRouter } from "./routes/metrics.js";
import { payRouter } from "./routes/pay.js";
import { attachWebSocket } from "./ws.js";

async function main(): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use(payRouter);
  app.use(agentsRouter);
  app.use(auditRouter);
  app.use(incidentsRouter);
  app.use(killSwitchRouter);
  app.use(metricsRouter);

  const dbReady = await ensureDbReady();
  if (!dbReady) {
    logger.warn(
      "Postgres not reachable on startup — API will run but writes will be best-effort. " +
        "Run `pnpm infra:up` then restart.",
    );
  }

  const server = createServer(app);
  attachWebSocket(server);

  server.listen(config.port, () => {
    logger.info(
      { port: config.port, nodeEnv: config.nodeEnv },
      "AgentGuard API listening",
    );
  });
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
