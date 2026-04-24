/**
 * Retroactively name the 6 Circle Wallets so they're legible in the Circle
 * Console (Wallets page). No-op if a wallet already has a name.
 *
 * Usage: pnpm --filter @agentguard/scripts exec tsx name-wallets.ts
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

interface NameSpec {
  envKey: string;
  name: string;
  refId: string;
}

const WALLETS: NameSpec[] = [
  { envKey: "DEMO_RESEARCH_AGENT_WALLET_ID", name: "research-agent-v1", refId: "agent:research-agent-v1" },
  { envKey: "DEMO_DATA_VENDOR_AGENT_WALLET_ID", name: "data-vendor-agent-v1", refId: "agent:data-vendor-agent-v1" },
  { envKey: "DEMO_SMS_AGENT_WALLET_ID", name: "sms-agent-v1", refId: "agent:sms-agent-v1" },
  { envKey: "DEMO_INFERENCE_AGENT_WALLET_ID", name: "inference-agent-v1", refId: "agent:inference-agent-v1" },
  { envKey: "DEMO_COMPROMISED_AGENT_WALLET_ID", name: "compromised-agent-v1", refId: "agent:compromised-agent-v1" },
  { envKey: "AGENTGUARD_TREASURY_WALLET_ID", name: "agentguard-treasury", refId: "agent:agentguard-treasury" },
];

async function main(): Promise<void> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) {
    console.error("error: CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set");
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  for (const spec of WALLETS) {
    const id = process.env[spec.envKey];
    if (!id) {
      console.warn(`  skipping ${spec.name}: ${spec.envKey} not in .env`);
      continue;
    }
    try {
      await client.updateWallet({ id, name: spec.name, refId: spec.refId });
      console.log(`  [ok] ${spec.name.padEnd(22)} ${id}`);
    } catch (err) {
      console.error(`  [fail] ${spec.name}: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
