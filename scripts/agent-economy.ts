/**
 * Live A2A traffic simulator.
 *
 * Spawns realistic patterns of agent-to-agent payments, each one going through
 * the full AgentGuard pipeline (policy + identity + anomaly + audit). Used to
 * make the dashboard feel like real infrastructure during the video.
 *
 * Target: ~1 payment/second, running indefinitely. Ctrl-C to stop.
 *
 * Usage:  pnpm sim
 *         (or)  tsx scripts/agent-economy.ts
 */
import { log, pay, randomChoice, sleep } from "./shared.js";

interface Flow {
  from: string;
  to: string;
  amountRange: [number, number];
  intent: string;
  task_prefix: string;
  delayMsRange: [number, number];
}

const FLOWS: Flow[] = [
  {
    from: "research-agent-v1",
    to: "data-vendor-agent-v1",
    amountRange: [0.0008, 0.0015],
    intent: "buy Q3 macro stats",
    task_prefix: "brief",
    delayMsRange: [2500, 3500],
  },
  {
    from: "data-vendor-agent-v1",
    to: "inference-agent-v1",
    amountRange: [0.002, 0.005],
    intent: "run summarization over fetched articles",
    task_prefix: "pipeline",
    delayMsRange: [4500, 5500],
  },
  {
    from: "inference-agent-v1",
    to: "sms-agent-v1",
    amountRange: [0.02, 0.06],
    intent: "SMS inference completion to operator",
    task_prefix: "notif",
    delayMsRange: [7500, 9000],
  },
  {
    from: "research-agent-v1",
    to: "inference-agent-v1",
    amountRange: [0.003, 0.008],
    intent: "classify newly scraped filings",
    task_prefix: "classify",
    delayMsRange: [4500, 5500],
  },
];

let running = true;
process.on("SIGINT", () => {
  running = false;
  console.log("\nstopping simulator…");
});

async function runFlow(flow: Flow): Promise<void> {
  while (running) {
    const amount = randFloat(flow.amountRange[0], flow.amountRange[1]);
    const intent = flow.intent;
    const task_id = `${flow.task_prefix}-${Math.floor(Math.random() * 10000)}`;
    try {
      const result = await pay({
        agent_id: flow.from,
        to_agent_id: flow.to,
        amount_usdc: Number(amount.toFixed(6)),
        intent,
        original_task_id: task_id,
        context: { simulator: true },
      });
      log(`${flow.from}→${flow.to}`, result);
    } catch (err) {
      console.error("pay error", err);
    }
    const wait = randFloat(flow.delayMsRange[0], flow.delayMsRange[1]);
    await sleep(wait);
  }
}

function randFloat(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

async function main(): Promise<void> {
  console.log(`starting ${FLOWS.length} A2A flows …`);
  await Promise.all(FLOWS.map(runFlow));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
