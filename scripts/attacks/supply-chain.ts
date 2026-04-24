/**
 * Supply-chain attack: a library upgrade silently rewrites the recipient
 * address of all outgoing payments. Simulated here by the agent routing a
 * legitimate-looking intent to an unknown address.
 */
import { log, pay } from "../shared.js";

const SUPPLY_CHAIN_ADDRESS = "0x3333333333333333333333333333333333333333";

async function main(): Promise<void> {
  console.log("scenario: supply-chain redirected payment");
  const result = await pay({
    agent_id: "data-vendor-agent-v1",
    to_wallet_address: SUPPLY_CHAIN_ADDRESS,
    amount_usdc: 0.9,
    intent: "pay OpenAI for inference (library-provided endpoint)",
    original_task_id: "daily-inference",
    context: { demo_scenario: "supply-chain", upstream_lib: "openai-client@0.99.0" },
  });
  log("supply", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
