import { Router } from "express";
import { isDbReady, pool } from "../db/client.js";
import { memStore } from "../db/memstore.js";

export const auditRouter: Router = Router();

/**
 * Export the on-chain audit log for an agent. Returns the JSON body for each
 * decision and the Arc tx hash that commits the body's hash on-chain.
 * Judges + compliance reviewers should be able to hit this endpoint.
 */
auditRouter.get("/v1/audit/:agent_id", async (req, res) => {
  const { agent_id } = req.params;
  const limit = Math.min(Number(req.query.limit ?? 200), 2000);

  if (!isDbReady()) {
    const entries = memStore.auditFor(agent_id, limit);
    return res.json({ agent_id, count: entries.length, entries });
  }

  try {
    const { rows } = await pool.query(
      `SELECT log_id, agent_id, request_id, decision, arc_tx_hash, metadata, created_at
         FROM audit_log
        WHERE agent_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [agent_id, limit],
    );
    res.json({ agent_id, count: rows.length, entries: rows });
  } catch (err) {
    res.status(500).json({ error: "db_error", detail: (err as Error).message });
  }
});
