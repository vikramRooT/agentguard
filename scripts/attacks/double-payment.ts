/**
 * Logic bug: agent tries to pay the same invoice twice. Second payment should
 * trigger the per-recipient daily cap and escalate for human review.
 */
import { log, pay, sleep } from "../shared.js";

async function main(): Promise<void> {
  console.log("scenario: duplicate invoice payment");
  for (let i = 0; i < 2; i++) {
    const result = await pay({
      agent_id: "research-agent-v1",
      to_agent_id: "inference-agent-v1",
      amount_usdc: 4.8,
      intent: `pay invoice INV-42 for batch inference (attempt ${i + 1})`,
      original_task_id: "invoice-INV-42",
      context: { demo_scenario: "duplicate-invoice", attempt: i + 1 },
    });
    log(`invoice #${i + 1}`, result);
    await sleep(400);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
