import { createHash, randomUUID } from "node:crypto";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { isDbReady, pool } from "../db/client.js";
import { memStore } from "../db/memstore.js";
import { circle } from "./circle.js";
import type { DecisionKind, PolicyTrace } from "../types.js";

export interface AuditWriteResult {
  tx_hash: string;
  explorer_url: string;
  body_hash: string;
  on_chain: boolean;
}

/**
 * Writes one audit nanopayment on Arc per governance decision.
 *
 * Day-2 decision point (pending primitive validation): is the memo field
 * big enough to hold the full JSON decision trace, or do we put only a
 * body_hash on-chain and keep the JSON body in Postgres?
 *
 * Default pessimistic path: hash-on-chain + body in Postgres. Adjust once
 * we measure the real memo size limit. See docs/primitives-validation.md.
 */
export async function writeAuditNanopayment(params: {
  agent_id: string;
  request_id: string;
  decision: DecisionKind;
  trace: PolicyTrace[];
  evidence: Record<string, unknown>;
}): Promise<AuditWriteResult> {
  const body = {
    agent_id: params.agent_id,
    request_id: params.request_id,
    decision: params.decision,
    trace: params.trace,
    evidence: params.evidence,
    timestamp: new Date().toISOString(),
    version: "1",
  };
  const bodyJson = JSON.stringify(body);
  const body_hash = "0x" + createHash("sha256").update(bodyJson).digest("hex");

  const memo = `ag:v1:${params.decision}:${body_hash}`;

  // Audit receipt is a real on-chain self-send from the AgentGuard treasury
  // wallet back to itself, with the decision body hash in refId. Every
  // governance decision produces one — this is what generates the hackathon's
  // 50+ on-chain tx count naturally.
  const treasuryWalletId = config.protocol.treasuryWalletId || "agentguard-treasury";
  const treasuryAddress = config.protocol.treasuryWalletAddress;

  const result = await circle.sendNanopayment({
    from_wallet_id: treasuryWalletId,
    to_address: treasuryAddress,
    amount_usdc: config.protocol.feePerCheckUsdc,
    memo,
  });

  const metadata = { body, body_hash, mock: result.mock ?? false };
  if (!isDbReady()) {
    memStore.recordAudit({
      log_id: randomUUID(),
      agent_id: params.agent_id,
      request_id: params.request_id,
      decision: params.decision,
      arc_tx_hash: result.tx_hash,
      metadata,
    });
  } else {
    try {
      await pool.query(
        `INSERT INTO audit_log (log_id, agent_id, request_id, decision, arc_tx_hash, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          randomUUID(),
          params.agent_id,
          params.request_id,
          params.decision,
          result.tx_hash,
          JSON.stringify(metadata),
        ],
      );
    } catch (err) {
      logger.debug({ err }, "audit_log insert skipped");
    }
  }

  return {
    tx_hash: result.tx_hash,
    explorer_url: result.explorer_url,
    body_hash,
    on_chain: !(result.mock ?? false),
  };
}
