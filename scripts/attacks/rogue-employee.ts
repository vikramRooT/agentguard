/**
 * Rogue employee scenario: legitimate-looking request through the agent,
 * but the recipient is subtly different from an approved vendor. Typo-squatting.
 */
import { log, pay } from "../shared.js";

const LOOKALIKE = "0x00D1abcdEF00D1abcdEF00D1abcdEF00D1abcdEF"; // looks like an approved vendor

async function main(): Promise<void> {
  console.log("scenario: rogue-employee typosquat recipient");
  const result = await pay({
    agent_id: "research-agent-v1",
    to_wallet_address: LOOKALIKE,
    amount_usdc: 4.95,
    intent: "pay approved vendor — routine monthly settlement",
    original_task_id: "vendor-settlement-2026-04",
    context: { demo_scenario: "rogue-employee-typosquat" },
  });
  log("rogue", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
