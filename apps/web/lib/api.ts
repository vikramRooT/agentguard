const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

export async function fetchOverview(): Promise<OverviewResponse> {
  const res = await fetch(`${API_BASE}/v1/metrics/overview`, { cache: "no-store" });
  if (!res.ok) throw new Error(`overview fetch ${res.status}`);
  return res.json();
}

export async function fetchIncidents(limit = 50): Promise<IncidentListResponse> {
  const res = await fetch(`${API_BASE}/v1/incidents?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`incidents fetch ${res.status}`);
  return res.json();
}

export async function fetchAgents(): Promise<AgentListResponse> {
  const res = await fetch(`${API_BASE}/v1/agents`, { cache: "no-store" });
  if (!res.ok) throw new Error(`agents fetch ${res.status}`);
  return res.json();
}

export async function pauseAgent(agentId: string, authorizedBy: string, reason?: string) {
  const res = await fetch(`${API_BASE}/v1/kill-switch/${encodeURIComponent(agentId)}/pause`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ authorized_by: authorizedBy, reason }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`pause ${res.status}: ${detail}`);
  }
  return res.json();
}

export async function unpauseAgent(agentId: string) {
  const res = await fetch(`${API_BASE}/v1/kill-switch/${encodeURIComponent(agentId)}/unpause`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`unpause ${res.status}`);
  return res.json();
}

export function openEventStream(onEvent: (ev: DashboardEvent) => void): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryMs = 500;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(WS_URL);
    ws.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data);
        onEvent(ev);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      if (!closed) setTimeout(connect, (retryMs = Math.min(retryMs * 2, 5000)));
    };
    ws.onerror = () => ws?.close();
  };

  connect();
  return () => {
    closed = true;
    ws?.close();
  };
}

// ---------------------------------------------------------------------------
// Types (kept client-side to avoid importing from the API package)
// ---------------------------------------------------------------------------

export type Decision = "approved" | "blocked" | "escalated";

export interface PaymentRow {
  request_id: string;
  agent_id: string;
  to_agent_id?: string;
  to_wallet_address?: string;
  amount_usdc: number;
  decision: Decision;
  reason: string;
  arc_tx_hash?: string;
  audit_tx_hash?: string;
  latency_ms: number;
  created_at: string;
}

export interface OverviewResponse {
  window: string;
  totals: {
    total: number;
    approved: number;
    blocked: number;
    escalated: number;
    volume_usdc: number;
  };
  per_agent: Array<{ agent_id: string; count: number; volume_usdc: number }>;
  protocol?: {
    fee_per_check_usdc: number;
    revenue_last_hour_usdc: number;
    revenue_lifetime_usdc: number;
    lifetime_checks: number;
    treasury_address: string;
  };
  recent_payments: PaymentRow[];
}

export interface IncidentRow {
  incident_id: string;
  request_id: string;
  agent_id: string;
  decision: Decision;
  reason: string;
  trace: Array<{
    layer: string;
    passed: boolean;
    reason: string;
    detail?: Record<string, unknown>;
    latency_ms: number;
  }>;
  evidence: Record<string, unknown>;
  arc_audit_tx_hash?: string;
  created_at: string;
}

export interface IncidentListResponse {
  incidents: IncidentRow[];
}

export interface AgentSummary {
  agent_id: string;
  paused: boolean;
  circle_wallet_id: string | null;
  owner_wallet_id: string | null;
  erc8004_identity: string | null;
}

export interface AgentListResponse {
  agents: AgentSummary[];
}

export type DashboardEvent =
  | { type: "hello"; payload: { ts: number } }
  | { type: "payment.approved"; payload: PaymentRow }
  | { type: "payment.blocked"; payload: PaymentRow }
  | { type: "payment.escalated"; payload: PaymentRow }
  | { type: "incident.new"; payload: IncidentRow }
  | { type: "agent.paused"; payload: { agent_id: string } }
  | { type: "agent.unpaused"; payload: { agent_id: string } };
