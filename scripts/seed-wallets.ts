/**
 * Provision the 6 demo wallets and register them as agents with AgentGuard.
 *
 * Runs against the running API on localhost:4000. Circle wallet creation goes
 * through the API's Circle service; when Circle credentials are not set, the
 * service returns deterministic mock wallet IDs so the rest of the demo works.
 *
 * Usage:  pnpm seed
 *         (or)  tsx scripts/seed-wallets.ts
 */
import { API_BASE, registerAgent } from "./shared.js";

interface AgentSpec {
  agent_id: string;
  role: string;
  policy: Record<string, unknown>;
  /** Env var key holding the Circle Wallet ID (optional). */
  walletIdEnv?: string;
  /** Env var key holding the Circle Wallet address (optional). */
  walletAddrEnv?: string;
}

const AGENTS: AgentSpec[] = [
  {
    agent_id: "research-agent-v1",
    role: "buys data from other agents for weekly briefings",
    walletIdEnv: "DEMO_RESEARCH_AGENT_WALLET_ID",
    walletAddrEnv: "DEMO_RESEARCH_AGENT_WALLET_ADDRESS",
    policy: {
      spending_limits: { per_transaction: 5, per_day: 50, per_recipient_per_day: 10 },
      recipient_policy: {
        type: "allowlist",
        approved_recipients: [
          "data-vendor-agent-v1",
          "sms-agent-v1",
          "inference-agent-v1",
        ],
        fallback_action: "block",
      },
      intent_verification: { enabled: true, sensitivity: "high" },
      approval_rules: [
        { if: "transaction_amount > 2", then: "require_human_approval" },
      ],
      kill_switch: { enabled: true, authorized_pausers: ["0xOperator"] },
      audit: { log_all_checks: true },
    },
  },
  {
    agent_id: "data-vendor-agent-v1",
    role: "sells sub-cent data reports",
    walletIdEnv: "DEMO_DATA_VENDOR_AGENT_WALLET_ID",
    walletAddrEnv: "DEMO_DATA_VENDOR_AGENT_WALLET_ADDRESS",
    policy: {
      spending_limits: { per_transaction: 1, per_day: 20 },
      recipient_policy: {
        type: "allowlist",
        approved_recipients: ["inference-agent-v1", "sms-agent-v1"],
        fallback_action: "block",
      },
      kill_switch: { enabled: true, authorized_pausers: ["0xOperator"] },
    },
  },
  {
    agent_id: "sms-agent-v1",
    role: "sends SMS notifications via Twilio",
    walletIdEnv: "DEMO_SMS_AGENT_WALLET_ID",
    walletAddrEnv: "DEMO_SMS_AGENT_WALLET_ADDRESS",
    policy: {
      spending_limits: { per_transaction: 0.1, per_day: 10 },
      recipient_policy: {
        type: "allowlist",
        approved_recipients: ["twilio-vendor"],
        fallback_action: "block",
      },
      kill_switch: { enabled: true, authorized_pausers: ["0xOperator"] },
    },
  },
  {
    agent_id: "inference-agent-v1",
    role: "runs AI inference tasks",
    walletIdEnv: "DEMO_INFERENCE_AGENT_WALLET_ID",
    walletAddrEnv: "DEMO_INFERENCE_AGENT_WALLET_ADDRESS",
    policy: {
      spending_limits: { per_transaction: 0.5, per_day: 15 },
      recipient_policy: {
        type: "allowlist",
        approved_recipients: ["openai-vendor", "anthropic-vendor", "sms-agent-v1"],
        fallback_action: "block",
      },
      kill_switch: { enabled: true, authorized_pausers: ["0xOperator"] },
    },
  },
  {
    agent_id: "compromised-agent-v1",
    role: "used only by the attack demo — simulates a compromised agent",
    walletIdEnv: "DEMO_COMPROMISED_AGENT_WALLET_ID",
    walletAddrEnv: "DEMO_COMPROMISED_AGENT_WALLET_ADDRESS",
    policy: {
      spending_limits: { per_transaction: 10, per_day: 100 },
      recipient_policy: { type: "open" },
      kill_switch: { enabled: true, authorized_pausers: ["0xOperator"] },
    },
  },
  {
    agent_id: "agentguard-treasury",
    role: "receives per-check governance fees and audit nanopayments",
    walletIdEnv: "AGENTGUARD_TREASURY_WALLET_ID",
    walletAddrEnv: "AGENTGUARD_TREASURY_WALLET_ADDRESS",
    policy: { recipient_policy: { type: "open" } },
  },
];

async function main(): Promise<void> {
  console.log(`API: ${API_BASE}`);
  let realCircleCount = 0;
  for (const spec of AGENTS) {
    const walletId = spec.walletIdEnv ? process.env[spec.walletIdEnv] : undefined;
    const walletAddr = spec.walletAddrEnv ? process.env[spec.walletAddrEnv] : undefined;
    const usingRealCircle = Boolean(walletId && walletAddr);

    // Derive a stable pseudo-ERC-8004 identity from the real wallet address
    // when we have one, otherwise fall back to a random one for mock mode.
    const erc8004 = walletAddr
      ? `erc8004:${spec.agent_id}:${walletAddr.slice(2, 10)}`
      : `erc8004:${spec.agent_id}:${Math.random().toString(16).slice(2, 10)}`;

    await registerAgent(spec.agent_id, spec.policy, {
      erc8004_identity: erc8004,
      circle_wallet_id: walletId || `wallet-${spec.agent_id}`,
      owner_wallet_id: walletAddr,
    });

    if (usingRealCircle) realCircleCount++;
    const mode = usingRealCircle ? "[circle]" : "[mock]  ";
    const addrTag = walletAddr ? ` ${walletAddr.slice(0, 10)}…` : "";
    console.log(`✓ ${mode} ${spec.agent_id.padEnd(24)}${addrTag}  ${spec.role}`);
  }
  console.log(`\nSeeded ${AGENTS.length} agents (${realCircleCount} backed by real Circle Wallets).`);
  console.log(`Next: pnpm sim   (to start A2A traffic) or pnpm demo:attack.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
