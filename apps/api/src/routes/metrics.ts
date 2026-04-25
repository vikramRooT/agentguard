import { Router } from "express";
import { config } from "../config.js";
import { isDbReady, pool } from "../db/client.js";
import { memStore } from "../db/memstore.js";

export const metricsRouter: Router = Router();

metricsRouter.get("/v1/metrics/overview", async (_req, res) => {
  if (!isDbReady()) {
    return res.json(buildOverviewFromMemory());
  }
  try {
    const [totals, perAgent, recent, lifetime] = await Promise.all([
      pool.query<{
        total: string;
        approved: string;
        blocked: string;
        escalated: string;
        volume: string;
      }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE decision = 'approved')::text AS approved,
           COUNT(*) FILTER (WHERE decision = 'blocked')::text  AS blocked,
           COUNT(*) FILTER (WHERE decision = 'escalated')::text AS escalated,
           COALESCE(SUM(amount_usdc) FILTER (WHERE decision = 'approved'), 0)::text AS volume
         FROM payments
         WHERE created_at > now() - INTERVAL '1 hour'`,
      ),
      pool.query<{
        agent_id: string;
        count: string;
        volume: string;
      }>(
        `SELECT agent_id,
                COUNT(*)::text AS count,
                COALESCE(SUM(amount_usdc) FILTER (WHERE decision = 'approved'), 0)::text AS volume
           FROM payments
          WHERE created_at > now() - INTERVAL '1 hour'
          GROUP BY agent_id
          ORDER BY COUNT(*) DESC
          LIMIT 20`,
      ),
      pool.query(
        `SELECT request_id, agent_id, to_agent_id, to_wallet_address,
                amount_usdc, decision, reason, arc_tx_hash, audit_tx_hash,
                latency_ms, created_at
           FROM payments
          ORDER BY created_at DESC
          LIMIT 50`,
      ),
      pool.query<{ total_checks: string }>(
        `SELECT COUNT(*)::text AS total_checks FROM payments`,
      ),
    ]);

    const t = totals.rows[0]!;
    const fee = config.protocol.feePerCheckUsdc;
    const checks1h = Number(t.total);
    const lifetimeChecks = Number(lifetime.rows[0]!.total_checks);
    res.json({
      window: "1h",
      totals: {
        total: checks1h,
        approved: Number(t.approved),
        blocked: Number(t.blocked),
        escalated: Number(t.escalated),
        volume_usdc: Number(t.volume),
      },
      per_agent: perAgent.rows.map((r) => ({
        agent_id: r.agent_id,
        count: Number(r.count),
        volume_usdc: Number(r.volume),
      })),
      protocol: {
        fee_per_check_usdc: fee,
        revenue_last_hour_usdc: Number((checks1h * fee).toFixed(6)),
        revenue_lifetime_usdc: Number((lifetimeChecks * fee).toFixed(6)),
        lifetime_checks: lifetimeChecks,
        treasury_address: config.protocol.treasuryWalletAddress,
      },
      recent_payments: recent.rows,
    });
  } catch (err) {
    res.status(500).json({
      error: "metrics_error",
      detail: (err as Error).message,
      totals: { total: 0, approved: 0, blocked: 0, escalated: 0, volume_usdc: 0 },
      per_agent: [],
      recent_payments: [],
    });
  }
});

metricsRouter.get("/v1/health", (_req, res) => {
  res.json({ ok: true, version: "0.1.0", ts: new Date().toISOString() });
});

// Bare /health for ops tooling (Railway, Kubernetes probes, etc.) that
// expect the unversioned convention.
metricsRouter.get("/health", (_req, res) => {
  res.json({ ok: true, version: "0.1.0", ts: new Date().toISOString() });
});

metricsRouter.get("/v1/debug/config", (_req, res) => {
  res.json({
    useMockCircle: process.env.USE_MOCK_CIRCLE,
    useMockClassifier: process.env.USE_MOCK_CLASSIFIER,
    provider: process.env.INTENT_CLASSIFIER_PROVIDER,
    anthropicKey: process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.slice(0, 16)}...` : "(empty)",
  });
});

function buildOverviewFromMemory() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const recent = memStore.payments.filter((p) => Date.parse(p.created_at) >= cutoff);

  const totals = {
    total: recent.length,
    approved: recent.filter((p) => p.decision === "approved").length,
    blocked: recent.filter((p) => p.decision === "blocked").length,
    escalated: recent.filter((p) => p.decision === "escalated").length,
    volume_usdc: recent
      .filter((p) => p.decision === "approved")
      .reduce((acc, p) => acc + p.amount_usdc, 0),
  };

  const perAgentMap = new Map<string, { count: number; volume_usdc: number }>();
  for (const p of recent) {
    const entry = perAgentMap.get(p.agent_id) ?? { count: 0, volume_usdc: 0 };
    entry.count += 1;
    if (p.decision === "approved") entry.volume_usdc += p.amount_usdc;
    perAgentMap.set(p.agent_id, entry);
  }
  const per_agent = Array.from(perAgentMap.entries())
    .map(([agent_id, v]) => ({ agent_id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    window: "1h",
    totals,
    per_agent,
    recent_payments: memStore.payments.slice(0, 50),
  };
}
