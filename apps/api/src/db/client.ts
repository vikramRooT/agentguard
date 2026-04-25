import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger.js";

const { Pool, types } = pg;

// node-pg returns NUMERIC as a string to preserve precision. We don't need
// 38-digit precision for USDC amounts or latency_ms, and the dashboard relies
// on real numbers (e.g. .toFixed()), so cast NUMERIC to float globally.
// Type OID 1700 = NUMERIC.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

export const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  idleTimeoutMillis: 30_000,
  // Bail quickly if the server isn't there instead of hanging the request.
  connectionTimeoutMillis: 2_000,
});

pool.on("error", () => {
  /* Swallow — when Postgres is down we run in-memory. */
});

// Observable flag the repo uses to route to Postgres vs. in-memory.
let dbReady = false;
export function isDbReady(): boolean {
  return dbReady;
}

export async function ensureDbReady(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbReady = true;
      logger.info("postgres ready");
      return true;
    } finally {
      client.release();
    }
  } catch {
    logger.warn("postgres not reachable — running in-memory");
    dbReady = false;
    return false;
  }
}
