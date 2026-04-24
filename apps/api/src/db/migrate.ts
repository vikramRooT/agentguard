import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";
import { logger } from "../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
  logger.info("applying schema.sql");
  await pool.query(sql);
  logger.info("schema applied");
  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, "migration failed");
  process.exit(1);
});
