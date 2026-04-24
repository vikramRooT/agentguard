/**
 * In-memory fallback store for the dashboard demo when Postgres is not
 * available. Mirrors the shape of repo.ts return values closely enough that
 * the dashboard + pipeline work end-to-end without a DB.
 *
 * Day-3: once Postgres is part of the workflow this becomes dev-only.
 */
import type {
  AgentRecord,
  DecisionKind,
  IncidentRecord,
  PaymentReceipt,
  PaymentRequest,
  PolicyTrace,
} from "../types.js";

interface PaymentRow {
  request_id: string;
  agent_id: string;
  to_agent_id: string | null;
  to_wallet_address: string | null;
  amount_usdc: number;
  asset: string;
  intent: string;
  original_task_id: string | null;
  decision: DecisionKind;
  reason: string;
  trace: PolicyTrace[];
  evidence: Record<string, unknown>;
  arc_tx_hash: string | null;
  audit_tx_hash: string | null;
  latency_ms: number;
  created_at: string;
}

interface BaselineRow {
  agent_id: string;
  recipient: string;
  sample_count: number;
  amount_mean: number;
  amount_m2: number;
}

export class MemStore {
  readonly agents = new Map<string, AgentRecord>();
  readonly payments: PaymentRow[] = [];
  readonly incidents: IncidentRecord[] = [];
  readonly baselines = new Map<string, BaselineRow>();
  readonly auditLog: Array<{
    log_id: string;
    agent_id: string;
    request_id: string | null;
    decision: DecisionKind;
    arc_tx_hash: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }> = [];

  upsertAgent(
    agent_id: string,
    patch: Partial<Omit<AgentRecord, "agent_id" | "created_at" | "updated_at">>,
  ): AgentRecord {
    const existing = this.agents.get(agent_id);
    const now = new Date().toISOString();
    const rec: AgentRecord = {
      agent_id,
      owner_wallet_id: patch.owner_wallet_id ?? existing?.owner_wallet_id,
      circle_wallet_id: patch.circle_wallet_id ?? existing?.circle_wallet_id,
      erc8004_identity: patch.erc8004_identity ?? existing?.erc8004_identity,
      paused: patch.paused ?? existing?.paused ?? false,
      policy: patch.policy ?? existing?.policy ?? {},
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.agents.set(agent_id, rec);
    return rec;
  }

  setPaused(agent_id: string, paused: boolean): void {
    const a = this.agents.get(agent_id);
    if (!a) return;
    a.paused = paused;
    a.updated_at = new Date().toISOString();
  }

  recordPayment(request: PaymentRequest, receipt: PaymentReceipt): void {
    this.payments.unshift({
      request_id: receipt.request_id,
      agent_id: request.agent_id,
      to_agent_id: request.to_agent_id ?? null,
      to_wallet_address: request.to_wallet_address ?? null,
      amount_usdc: request.amount_usdc,
      asset: request.asset,
      intent: request.intent,
      original_task_id: request.original_task_id ?? null,
      decision: receipt.decision,
      reason: receipt.reason,
      trace: receipt.trace,
      evidence: receipt.evidence,
      arc_tx_hash: receipt.arc_tx_hash ?? null,
      audit_tx_hash: receipt.audit_tx_hash ?? null,
      latency_ms: receipt.latency_ms,
      created_at: receipt.created_at,
    });
    // Keep only the most recent 2000 so memory stays bounded.
    if (this.payments.length > 2000) this.payments.length = 2000;
  }

  recordIncident(
    request_id: string,
    agent_id: string,
    decision: DecisionKind,
    reason: string,
    trace: PolicyTrace[],
    evidence: Record<string, unknown>,
    arc_audit_tx_hash: string | null,
  ): IncidentRecord {
    const incident: IncidentRecord = {
      incident_id: crypto.randomUUID(),
      agent_id,
      decision,
      reason,
      trace,
      evidence,
      arc_audit_tx_hash: arc_audit_tx_hash ?? undefined,
      created_at: new Date().toISOString(),
    };
    this.incidents.unshift(incident);
    if (this.incidents.length > 500) this.incidents.length = 500;
    return incident;
  }

  recentPayments(limit = 100): PaymentRow[] {
    return this.payments.slice(0, limit);
  }

  listIncidents(limit = 50): IncidentRecord[] {
    return this.incidents.slice(0, limit);
  }

  dailySpend(agent_id: string): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return this.payments
      .filter(
        (p) =>
          p.agent_id === agent_id &&
          p.decision === "approved" &&
          Date.parse(p.created_at) >= cutoff,
      )
      .reduce((acc, p) => acc + p.amount_usdc, 0);
  }

  perRecipientSpend(agent_id: string, recipient: string): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return this.payments
      .filter(
        (p) =>
          p.agent_id === agent_id &&
          p.decision === "approved" &&
          (p.to_agent_id === recipient || p.to_wallet_address === recipient) &&
          Date.parse(p.created_at) >= cutoff,
      )
      .reduce((acc, p) => acc + p.amount_usdc, 0);
  }

  updateBaseline(agent_id: string, recipient: string, amount: number): void {
    const key = `${agent_id}::${recipient}`;
    const prev = this.baselines.get(key);
    if (!prev) {
      this.baselines.set(key, {
        agent_id,
        recipient,
        sample_count: 1,
        amount_mean: amount,
        amount_m2: 0,
      });
      return;
    }
    const newCount = prev.sample_count + 1;
    const delta = amount - prev.amount_mean;
    const newMean = prev.amount_mean + delta / newCount;
    const delta2 = amount - newMean;
    this.baselines.set(key, {
      agent_id,
      recipient,
      sample_count: newCount,
      amount_mean: newMean,
      amount_m2: prev.amount_m2 + delta * delta2,
    });
  }

  getBaseline(
    agent_id: string,
    recipient: string,
  ): { count: number; mean: number; stdDev: number } | null {
    const key = `${agent_id}::${recipient}`;
    const row = this.baselines.get(key);
    if (!row) return null;
    const variance = row.sample_count > 1 ? row.amount_m2 / (row.sample_count - 1) : 0;
    return { count: row.sample_count, mean: row.amount_mean, stdDev: Math.sqrt(variance) };
  }

  recordAudit(entry: {
    log_id: string;
    agent_id: string;
    request_id: string | null;
    decision: DecisionKind;
    arc_tx_hash: string | null;
    metadata: Record<string, unknown>;
  }): void {
    this.auditLog.unshift({ ...entry, created_at: new Date().toISOString() });
    if (this.auditLog.length > 5000) this.auditLog.length = 5000;
  }

  auditFor(agent_id: string, limit = 200) {
    return this.auditLog.filter((e) => e.agent_id === agent_id).slice(0, limit);
  }
}

export const memStore = new MemStore();
