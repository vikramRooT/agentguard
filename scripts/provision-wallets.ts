/**
 * Create a Circle Wallet Set + one developer-controlled wallet per demo agent.
 *
 * Reads  CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET from .env
 * Writes CIRCLE_WALLET_SET_ID and per-agent DEMO_*_WALLET_ID + *_ADDRESS back
 *        to .env.
 *
 * Strategy: we try blockchain "ARC-TESTNET" first (the Python circlekit docs
 * imply it's supported once the SDK exposes it). If the API rejects that, we
 * fall back to "ETH-SEPOLIA" because:
 *   (a) CircleWalletSigner signs EIP-712 data chain-agnostically, so the
 *       resulting wallet address can sign payments that Gateway settles on Arc.
 *   (b) We can deposit USDC into Gateway from a separate Arc-native wallet
 *       via `deposit_for(depositor, amount)`, if we need to pre-fund.
 * Either way, the 20-character EVM address is valid on both chains.
 *
 * Usage:
 *     pnpm --filter @agentguard/scripts exec tsx provision-wallets.ts
 */
import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const ENV_PATH = join(REPO_ROOT, ".env");

dotenv.config({ path: ENV_PATH });

interface AgentSpec {
  envKey: string; // env var for wallet id
  addrEnvKey: string; // env var for wallet address
  label: string;
  agentId: string;
}

// Six agents: five "productive" + AgentGuard Treasury.
const AGENTS: AgentSpec[] = [
  {
    envKey: "DEMO_RESEARCH_AGENT_WALLET_ID",
    addrEnvKey: "DEMO_RESEARCH_AGENT_WALLET_ADDRESS",
    label: "research-agent-v1",
    agentId: "research-agent-v1",
  },
  {
    envKey: "DEMO_DATA_VENDOR_AGENT_WALLET_ID",
    addrEnvKey: "DEMO_DATA_VENDOR_AGENT_WALLET_ADDRESS",
    label: "data-vendor-agent-v1",
    agentId: "data-vendor-agent-v1",
  },
  {
    envKey: "DEMO_SMS_AGENT_WALLET_ID",
    addrEnvKey: "DEMO_SMS_AGENT_WALLET_ADDRESS",
    label: "sms-agent-v1",
    agentId: "sms-agent-v1",
  },
  {
    envKey: "DEMO_INFERENCE_AGENT_WALLET_ID",
    addrEnvKey: "DEMO_INFERENCE_AGENT_WALLET_ADDRESS",
    label: "inference-agent-v1",
    agentId: "inference-agent-v1",
  },
  {
    envKey: "DEMO_COMPROMISED_AGENT_WALLET_ID",
    addrEnvKey: "DEMO_COMPROMISED_AGENT_WALLET_ADDRESS",
    label: "compromised-agent-v1",
    agentId: "compromised-agent-v1",
  },
  {
    envKey: "AGENTGUARD_TREASURY_WALLET_ID",
    addrEnvKey: "AGENTGUARD_TREASURY_WALLET_ADDRESS",
    label: "agentguard-treasury",
    agentId: "agentguard-treasury",
  },
];

const CANDIDATE_BLOCKCHAINS = ["ARC-TESTNET", "ETH-SEPOLIA"] as const;

function replaceEnvLine(envText: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(envText)) return envText.replace(re, `${key}=${value}`);
  return envText.replace(/\s*$/, "") + `\n${key}=${value}\n`;
}

function redact(s: string): string {
  return s.length <= 8 ? "***" : `${s.slice(0, 6)}…${s.slice(-4)}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) {
    console.error("error: CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET must both be set in .env");
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  // ------------------------------------------------------------------
  // 1. Create (or reuse) a Wallet Set.
  // ------------------------------------------------------------------
  let walletSetId = process.env.CIRCLE_WALLET_SET_ID || "";
  if (walletSetId) {
    console.log(`reusing existing wallet set: ${walletSetId}`);
  } else {
    console.log("creating wallet set...");
    const ws = await client.createWalletSet({
      name: `agentguard-${Date.now()}`,
    });
    walletSetId = ws.data?.walletSet?.id ?? "";
    if (!walletSetId) {
      console.error("error: wallet set response missing id");
      console.error(JSON.stringify(ws, null, 2));
      process.exit(1);
    }
    console.log(`  walletSetId = ${walletSetId}`);
  }

  // ------------------------------------------------------------------
  // 2. Detect which blockchain enum Circle accepts for Arc.
  // ------------------------------------------------------------------
  let blockchain = "";
  let lastErr: unknown;
  for (const candidate of CANDIDATE_BLOCKCHAINS) {
    try {
      console.log(`probing blockchain support: ${candidate}...`);
      const probe = await client.createWallets({
        walletSetId,
        blockchains: [candidate as never],
        count: 1,
        idempotencyKey: crypto.randomUUID(),
      });
      const probeWallet = probe.data?.wallets?.[0];
      if (!probeWallet) {
        lastErr = "empty probe response";
        continue;
      }
      console.log(`  ok: created probe wallet ${probeWallet.id} on ${candidate}`);
      // Reuse probe wallet as treasury to avoid waste.
      await applyWalletToAgent(AGENTS[AGENTS.length - 1]!, probeWallet);
      blockchain = candidate;
      break;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  rejected: ${msg}`);
    }
  }
  if (!blockchain) {
    console.error("error: none of the candidate blockchains worked");
    console.error(lastErr);
    process.exit(1);
  }
  console.log(`using blockchain=${blockchain}\n`);

  // ------------------------------------------------------------------
  // 3. Create the remaining agent wallets.
  // ------------------------------------------------------------------
  const remaining = AGENTS.slice(0, -1); // treasury already done
  console.log(`creating ${remaining.length} agent wallets...`);
  const response = await client.createWallets({
    walletSetId,
    blockchains: [blockchain as never],
    count: remaining.length,
    idempotencyKey: crypto.randomUUID(),
  });
  const wallets = response.data?.wallets ?? [];
  if (wallets.length !== remaining.length) {
    console.error(
      `error: expected ${remaining.length} wallets, got ${wallets.length}`,
    );
    console.error(JSON.stringify(response, null, 2));
    process.exit(1);
  }

  for (let i = 0; i < remaining.length; i++) {
    await applyWalletToAgent(remaining[i]!, wallets[i]!);
  }

  // ------------------------------------------------------------------
  // 4. Persist walletSetId, wallet ids, addresses.
  // ------------------------------------------------------------------
  let envText = readFileSync(ENV_PATH, "utf8");
  envText = replaceEnvLine(envText, "CIRCLE_WALLET_SET_ID", walletSetId);
  for (const agent of AGENTS) {
    const id = process.env[agent.envKey] ?? "";
    const addr = process.env[agent.addrEnvKey] ?? "";
    if (id) envText = replaceEnvLine(envText, agent.envKey, id);
    if (addr) envText = replaceEnvLine(envText, agent.addrEnvKey, addr);
  }
  writeFileSync(ENV_PATH, envText, "utf8");

  console.log(`\nprovisioned ${AGENTS.length} Circle wallets, written to .env`);
  console.log(`wallet set: ${walletSetId}`);
  console.log(`blockchain: ${blockchain}`);
  for (const agent of AGENTS) {
    const id = process.env[agent.envKey];
    const addr = process.env[agent.addrEnvKey];
    console.log(`  ${agent.label.padEnd(22)} ${redact(id ?? "-")}  ${addr ?? "(no addr)"}`);
  }
  console.log(
    "\nnext: `pnpm --filter @agentguard/scripts exec tsx seed-wallets.ts` so " +
      "AgentGuard picks up the new wallet IDs.",
  );
}

async function applyWalletToAgent(
  agent: AgentSpec,
  wallet: { id?: string | null; address?: string | null },
): Promise<void> {
  const id = wallet.id ?? "";
  const addr = wallet.address ?? "";
  if (!id) throw new Error(`wallet for ${agent.label} missing id`);
  process.env[agent.envKey] = id;
  process.env[agent.addrEnvKey] = addr;
  console.log(
    `  ${agent.label.padEnd(22)} id=${redact(id)}  addr=${addr || "(pending)"}`,
  );
}

main().catch((err) => {
  console.error("provisioning failed:");
  console.error(err);
  process.exit(1);
});
