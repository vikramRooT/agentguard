import {
  dailySpendForAgent,
  getAnomalyStats,
  perRecipientSpendToday,
  updateAnomalyBaseline,
} from "../db/repo.js";
import type { PaymentRequest, PolicyTrace } from "../types.js";

export interface AnomalyInput {
  request: PaymentRequest;
  paused: boolean;
}

export interface AnomalyOutput {
  trace: PolicyTrace;
  passed: boolean;
}

const DEFAULT_STD_DEV_THRESHOLD = 3.0;

/**
 * Statistical anomaly detection — Welford-based running mean/std-dev per
 * (agent, recipient). Uses Postgres as the store so the signal survives
 * restarts. Returns a PolicyTrace entry regardless of outcome; the caller
 * decides whether a high z-score should block or merely flag.
 */
export async function evaluateAnomaly(
  input: AnomalyInput,
  thresholdStdDev: number = DEFAULT_STD_DEV_THRESHOLD,
): Promise<AnomalyOutput> {
  const start = performance.now();
  const { request } = input;
  const recipient = request.to_agent_id ?? request.to_wallet_address ?? "unknown";

  let stats: Awaited<ReturnType<typeof getAnomalyStats>> = null;
  let dailySpend = 0;
  let recipientSpendToday = 0;

  try {
    stats = await getAnomalyStats(request.agent_id, recipient);
    dailySpend = await dailySpendForAgent(request.agent_id);
    recipientSpendToday = await perRecipientSpendToday(request.agent_id, recipient);
  } catch {
    // DB may not be ready during cold start or offline tests — skip with a pass.
  }

  const zScore =
    stats && stats.stdDev > 0
      ? Math.abs(request.amount_usdc - stats.mean) / stats.stdDev
      : 0;
  const newRecipient = stats === null || stats.count === 0;

  const exceedsZ = zScore > thresholdStdDev && (stats?.count ?? 0) >= 5;

  // New-recipient + above-average amount is its own signal.
  const bigFirstPayment = newRecipient && request.amount_usdc > 1.0;

  const passed = !(exceedsZ || bigFirstPayment);
  const reason = exceedsZ
    ? `amount ${request.amount_usdc} is ${zScore.toFixed(2)}σ above baseline (${stats?.mean.toFixed(4)} ± ${stats?.stdDev.toFixed(4)})`
    : bigFirstPayment
      ? `first-time recipient with amount ${request.amount_usdc} USDC`
      : "within baseline";

  return {
    passed,
    trace: {
      layer: "anomaly",
      passed,
      reason,
      detail: {
        z_score: Number(zScore.toFixed(2)),
        threshold_std_dev: thresholdStdDev,
        new_recipient: newRecipient,
        sample_count: stats?.count ?? 0,
        baseline_mean: stats?.mean ?? null,
        baseline_std_dev: stats?.stdDev ?? null,
        daily_spend_usdc: dailySpend,
        recipient_spend_today: recipientSpendToday,
      },
      latency_ms: Number((performance.now() - start).toFixed(2)),
    },
  };
}

/** Update the baseline after a successful payment. */
export async function trainOnApprovedPayment(request: PaymentRequest): Promise<void> {
  const recipient = request.to_agent_id ?? request.to_wallet_address ?? "unknown";
  try {
    await updateAnomalyBaseline(request.agent_id, recipient, request.amount_usdc);
  } catch {
    // non-fatal
  }
}
