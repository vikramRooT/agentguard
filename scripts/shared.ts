import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load .env from the repo root regardless of CWD the script was launched from.
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

export const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";

export interface PaymentResult {
  request_id: string;
  decision: "approved" | "blocked" | "escalated";
  reason: string;
  amount_usdc: number;
  arc_tx_hash?: string;
  audit_tx_hash?: string;
  latency_ms: number;
}

export async function registerAgent(
  agent_id: string,
  policy: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/agents/${encodeURIComponent(agent_id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ policy, ...extra }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`registerAgent ${agent_id}: ${res.status} ${detail}`);
  }
}

export async function pay(payload: Record<string, unknown>): Promise<PaymentResult> {
  const res = await fetch(`${API_BASE}/v1/pay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as PaymentResult;
  return body;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function log(scenario: string, result: PaymentResult): void {
  const icon =
    result.decision === "approved" ? "✓" : result.decision === "blocked" ? "✗" : "!";
  // eslint-disable-next-line no-console
  console.log(
    `${icon} [${scenario}] ${result.decision.padEnd(10)} $${result.amount_usdc
      .toFixed(4)
      .padStart(8)} · ${result.latency_ms.toFixed(0)}ms · ${result.reason}`,
  );
}
