/**
 * Large first payment to a never-seen recipient. Anomaly layer should flag
 * and escalate even though the individual amount is under the per-tx cap.
 */
import { log, pay } from "../shared.js";

async function main(): Promise<void> {
  console.log("scenario: large first payment to new recipient");
  const result = await pay({
    agent_id: "research-agent-v1",
    to_wallet_address: "0x2222222222222222222222222222222222222222",
    amount_usdc: 4.0,
    intent: "pay new partner for data-access pilot",
    original_task_id: "pilot-setup",
    context: { demo_scenario: "new-recipient-large" },
  });
  log("new-rcpt", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
