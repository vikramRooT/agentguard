import { randomUUID } from "node:crypto";
import { isDbReady, pool } from "./client.js";
import { memStore } from "./memstore.js";
import type {
  AgentRecord,
  DecisionKind,
  IncidentRecord,
  PaymentReceipt,
  PaymentRequest,
  PolicyTrace,
} from "../types.js";

export async function upsertAgent(
  agent_id: string,
  patch: Partial<Omit<AgentRecord, "agent_id" | "created_at" | "updated_at">>,
): Promise<AgentRecord> {
  if (!isDbReady()) {
    return memStore.upsertAgent(agent_id, patch);
  }
  const policy = patch.policy ?? {};
  const paused = patch.paused ?? false;
  const { rows } = await pool.query<AgentRecord>(
    `INSERT INTO agents (agent_id, owner_wallet_id, circle_wallet_id, erc8004_identity, paused, policy)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (agent_id) DO UPDATE
       SET owner_wallet_id  = COALESCE(EXCLUDED.owner_wallet_id,  agents.owner_wallet_id),
           circle_wallet_id = COALESCE(EXCLUDED.circle_wallet_id, agents.circle_wallet_id),
           erc8004_identity = COALESCE(EXCLUDED.erc8004_identity, agents.erc8004_identity),
           paused           = EXCLUDED.paused,
           policy           = EXCLUDED.policy,
           updated_at       = now()
     RETURNING *`,
    [
      agent_id,
      patch.owner_wallet_id ?? null,
      patch.circle_wallet_id ?? null,
      patch.erc8004_identity ?? null,
      paused,
      JSON.stringify(policy),
    ],
  );
  return rows[0]!;
}

export async function getAgent(agent_id: string): Promise<AgentRecord | null> {
  if (!isDbReady()) {
    return memStore.agents.get(agent_id) ?? null;
  }
  const { rows } = await pool.query<AgentRecord>(
    "SELECT * FROM agents WHERE agent_id = $1",
    [agent_id],
  );
  return rows[0] ?? null;
}

export async function setAgentPaused(agent_id: string, paused: boolean): Promise<void> {
  if (!isDbReady()) {
    memStore.setPaused(agent_id, paused);
    return;
  }
  await pool.query(
    "UPDATE agents SET paused = $2, updated_at = now() WHERE agent_id = $1",
    [agent_id, paused],
  );
}

export async function recordPayment(
  request: PaymentRequest,
  receipt: PaymentReceipt,
): Promise<void> {
  if (!isDbReady()) {
    memStore.recordPayment(request, receipt);
    return;
  }
  await pool.query(
    `INSERT INTO payments (
       request_id, agent_id, to_agent_id, to_wallet_address,
       amount_usdc, asset, intent, original_task_id,
       decision, reason, trace, evidence,
       arc_tx_hash, audit_tx_hash, latency_ms
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15)
     ON CONFLICT (request_id) DO NOTHING`,
    [
      receipt.request_id,
      request.agent_id,
      request.to_agent_id ?? null,
      request.to_wallet_address ?? null,
      request.amount_usdc,
      request.asset,
      request.intent,
      request.original_task_id ?? null,
      receipt.decision,
      receipt.reason,
      JSON.stringify(receipt.trace),
      JSON.stringify(receipt.evidence),
      receipt.arc_tx_hash ?? null,
      receipt.audit_tx_hash ?? null,
      receipt.latency_ms,
    ],
  );
}

export async function recordIncident(
  request_id: string,
  agent_id: string,
  decision: DecisionKind,
  reason: string,
  trace: PolicyTrace[],
  evidence: Record<string, unknown>,
  arc_audit_tx_hash: string | null,
): Promise<IncidentRecord> {
  if (!isDbReady()) {
    return memStore.recordIncident(
      request_id,
      agent_id,
      decision,
      reason,
      trace,
      evidence,
      arc_audit_tx_hash,
    );
  }
  const incident_id = randomUUID();
  const { rows } = await pool.query<IncidentRecord>(
    `INSERT INTO incidents (incident_id, request_id, agent_id, decision, reason, trace, evidence, arc_audit_tx_hash)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
     RETURNING *`,
    [
      incident_id,
      request_id,
      agent_id,
      decision,
      reason,
      JSON.stringify(trace),
      JSON.stringify(evidence),
      arc_audit_tx_hash,
    ],
  );
  return rows[0]!;
}

export async function recentPayments(limit = 100): Promise<unknown[]> {
  if (!isDbReady()) {
    return memStore.recentPayments(limit);
  }
  const { rows } = await pool.query(
    `SELECT * FROM payments ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function listIncidents(limit = 50): Promise<IncidentRecord[]> {
  if (!isDbReady()) {
    return memStore.listIncidents(limit);
  }
  const { rows } = await pool.query<IncidentRecord>(
    `SELECT * FROM incidents ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function dailySpendForAgent(agent_id: string): Promise<number> {
  if (!isDbReady()) {
    return memStore.dailySpend(agent_id);
  }
  const { rows } = await pool.query<{ sum: string | null }>(
    `SELECT COALESCE(SUM(amount_usdc), 0)::text AS sum
       FROM payments
      WHERE agent_id = $1
        AND decision = 'approved'
        AND created_at > now() - INTERVAL '1 day'`,
    [agent_id],
  );
  return Number(rows[0]?.sum ?? 0);
}

export async function perRecipientSpendToday(
  agent_id: string,
  recipient: string,
): Promise<number> {
  if (!isDbReady()) {
    return memStore.perRecipientSpend(agent_id, recipient);
  }
  const { rows } = await pool.query<{ sum: string | null }>(
    `SELECT COALESCE(SUM(amount_usdc), 0)::text AS sum
       FROM payments
      WHERE agent_id = $1
        AND (to_agent_id = $2 OR to_wallet_address = $2)
        AND decision = 'approved'
        AND created_at > now() - INTERVAL '1 day'`,
    [agent_id, recipient],
  );
  return Number(rows[0]?.sum ?? 0);
}

export async function updateAnomalyBaseline(
  agent_id: string,
  recipient: string,
  amount: number,
): Promise<void> {
  if (!isDbReady()) {
    memStore.updateBaseline(agent_id, recipient, amount);
    return;
  }
  await pool.query(
    `INSERT INTO anomaly_baseline (agent_id, recipient, sample_count, amount_mean, amount_m2)
     VALUES ($1, $2, 1, $3, 0)
     ON CONFLICT (agent_id, recipient) DO UPDATE
       SET sample_count = anomaly_baseline.sample_count + 1,
           amount_mean  = anomaly_baseline.amount_mean
                        + ($3::numeric - anomaly_baseline.amount_mean) / (anomaly_baseline.sample_count + 1),
           amount_m2    = anomaly_baseline.amount_m2
                        + ($3::numeric - anomaly_baseline.amount_mean)
                        * ($3::numeric - (anomaly_baseline.amount_mean
                            + ($3::numeric - anomaly_baseline.amount_mean) / (anomaly_baseline.sample_count + 1))),
           last_seen    = now()`,
    [agent_id, recipient, amount],
  );
}

export async function getAnomalyStats(
  agent_id: string,
  recipient: string,
): Promise<{ count: number; mean: number; stdDev: number } | null> {
  if (!isDbReady()) {
    return memStore.getBaseline(agent_id, recipient);
  }
  const { rows } = await pool.query<{
    sample_count: number;
    amount_mean: string;
    amount_m2: string;
  }>(
    `SELECT sample_count, amount_mean, amount_m2
       FROM anomaly_baseline
      WHERE agent_id = $1 AND recipient = $2`,
    [agent_id, recipient],
  );
  if (rows.length === 0) return null;
  const row = rows[0]!;
  const count = Number(row.sample_count);
  const mean = Number(row.amount_mean);
  const m2 = Number(row.amount_m2);
  const variance = count > 1 ? m2 / (count - 1) : 0;
  return { count, mean, stdDev: Math.sqrt(variance) };
}
