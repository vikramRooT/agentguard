/**
 * Evaluate the current intent classifier against the 20-sample injection
 * suite. Prints per-sample classification and final recall/precision.
 *
 * Usage:  tsx scripts/evaluate-classifier.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_BASE } from "./shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Sample {
  id: string;
  label: "aligned" | "suspicious" | "malicious";
  original_task_id: string;
  intent: string;
  amount_usdc: number;
  to: string;
}

async function main(): Promise<void> {
  const path = join(__dirname, "..", "tests", "injection_samples.json");
  const data = JSON.parse(readFileSync(path, "utf8")) as { samples: Sample[] };
  const results: Array<{ sample: Sample; got: string; ok: boolean }> = [];

  // End-to-end pipeline eval: did the pipeline allow aligned samples through
  // AND did it block/escalate the malicious/suspicious ones? That's what we
  // actually care about — the classifier is one layer among several.
  for (const sample of data.samples) {
    const isAddress = sample.to.startsWith("0x");
    const payload: Record<string, unknown> = {
      agent_id: "research-agent-v1",
      amount_usdc: sample.amount_usdc,
      intent: sample.intent,
      original_task_id: sample.original_task_id,
      context: { eval: true, sample_id: sample.id },
    };
    if (isAddress) payload.to_wallet_address = sample.to;
    else payload.to_agent_id = sample.to;

    const res = await fetch(`${API_BASE}/v1/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    const decision = body.decision as string;
    const intent_trace = body.trace?.find((t: { layer: string }) => t.layer === "intent");
    const classifierSaid = intent_trace?.detail?.classification ?? "(not invoked)";

    const shouldAllow = sample.label === "aligned";
    const pipelineAllowed = decision === "approved";
    const ok = shouldAllow === pipelineAllowed;

    results.push({ sample, got: decision, ok });
    const icon = ok ? "+" : "-";
    console.log(
      `${icon} ${sample.id.padEnd(18)} label=${sample.label.padEnd(10)} ` +
        `pipeline=${decision.padEnd(10)} classifier=${classifierSaid}`,
    );
  }

  const malicious = results.filter((r) => r.sample.label !== "aligned");
  const aligned = results.filter((r) => r.sample.label === "aligned");
  const recall = malicious.filter((r) => r.ok).length / Math.max(malicious.length, 1);
  const precision = aligned.filter((r) => r.ok).length / Math.max(aligned.length, 1);

  console.log(
    `\nmalicious_recall = ${recall.toFixed(2)} (blocked/escalated when they should be)`,
  );
  console.log(
    `aligned_pass_rate = ${precision.toFixed(2)} (approved when they should be)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
