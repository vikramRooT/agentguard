import { z } from "zod";

export const PaymentRequestSchema = z.object({
  agent_id: z.string().min(1),
  to_agent_id: z.string().min(1).optional(),
  to_wallet_address: z.string().min(1).optional(),
  amount_usdc: z.number().positive(),
  asset: z.literal("USDC").default("USDC"),
  intent: z.string().min(1).max(2048),
  original_task_id: z.string().optional(),
  context: z.record(z.unknown()).default({}),
});

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

export type DecisionKind = "approved" | "blocked" | "escalated";
export type LayerName = "kill_switch" | "identity" | "policy" | "anomaly" | "intent";

export interface PolicyTrace {
  layer: LayerName;
  passed: boolean;
  reason: string;
  detail: Record<string, unknown>;
  latency_ms: number;
}

export interface PaymentReceipt {
  request_id: string;
  agent_id: string;
  decision: DecisionKind;
  approved: boolean;
  amount_usdc: number;
  to_agent_id?: string;
  to_wallet_address?: string;
  reason: string;
  trace: PolicyTrace[];
  arc_tx_hash?: string;
  audit_tx_hash?: string;
  evidence: Record<string, unknown>;
  latency_ms: number;
  created_at: string;
}

export interface AgentRecord {
  agent_id: string;
  owner_wallet_id?: string;
  circle_wallet_id?: string;
  erc8004_identity?: string;
  paused: boolean;
  policy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IncidentRecord {
  incident_id: string;
  agent_id: string;
  decision: DecisionKind;
  reason: string;
  trace: PolicyTrace[];
  evidence: Record<string, unknown>;
  arc_audit_tx_hash?: string;
  created_at: string;
}
