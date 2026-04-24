/**
 * Gradual treasury drain: many under-threshold payments to an unfamiliar
 * recipient. Policy's per-transaction cap doesn't fire, but anomaly
 * detection catches the new-recipient + unusual-frequency signal.
 */
import { log, pay, sleep } from "../shared.js";

const UNFAMILIAR = "0x1111111111111111111111111111111111111111";

async function main(): Promise<void> {
  console.log("scenario: gradual drain (24 sub-threshold payments)");
  for (let i = 0; i < 24; i++) {
    const result = await pay({
      agent_id: "research-agent-v1",
      to_wallet_address: UNFAMILIAR,
      amount_usdc: 0.49,
      intent: `routine batch transfer ${i + 1}`,
      original_task_id: "daily-sweep",
      context: { demo_scenario: "gradual-drain", sequence: i },
    });
    log(`drain #${String(i + 1).padStart(2, "0")}`, result);
    await sleep(200);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
