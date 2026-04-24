import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load .env from the repo root (apps/api/../../.env) regardless of CWD.
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env"), override: true });

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

export const config = {
  port: num("API_PORT", 4000),
  nodeEnv: str("NODE_ENV", "development"),

  circle: {
    apiKey: str("CIRCLE_API_KEY"),
    entitySecret: str("CIRCLE_ENTITY_SECRET"),
    walletSetId: str("CIRCLE_WALLET_SET_ID"),
    env: str("CIRCLE_ENV", "sandbox"),
  },

  arc: {
    rpcUrl: str("ARC_RPC_URL", "https://testnet-rpc.arc.network"),
    chainId: num("ARC_CHAIN_ID", 421),
    blockExplorer: str("ARC_BLOCK_EXPLORER", "https://testnet.arcscan.com"),
    usdcContract: str("ARC_USDC_CONTRACT"),
  },

  protocol: {
    feePerCheckUsdc: num("AGENTGUARD_FEE_PER_CHECK_USDC", 0.0001),
    treasuryWalletId: str("AGENTGUARD_TREASURY_WALLET_ID"),
    treasuryWalletAddress: str("AGENTGUARD_TREASURY_WALLET_ADDRESS"),
  },

  intentClassifier: {
    provider: str("INTENT_CLASSIFIER_PROVIDER", "anthropic"),
    anthropic: {
      apiKey: str("ANTHROPIC_API_KEY"),
      model: str("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
    },
    gemini: {
      apiKey: str("GEMINI_API_KEY"),
      model: str("GEMINI_MODEL", "gemini-2.5-flash"),
    },
    aimlApiKey: str("AIMLAPI_KEY"),
  },

  db: {
    url: str("DATABASE_URL", "postgresql://agentguard:agentguard@localhost:5432/agentguard"),
  },

  redis: {
    url: str("REDIS_URL", "redis://localhost:6379"),
  },

  flags: {
    useMockCircle: bool("USE_MOCK_CIRCLE", false),
    useMockClassifier: bool("USE_MOCK_CLASSIFIER", false),
  },
};

export function circleConfigured(): boolean {
  return (
    !config.flags.useMockCircle &&
    config.circle.apiKey !== "" &&
    !config.circle.apiKey.startsWith("TEST_API_KEY:replace")
  );
}

export function classifierConfigured(): boolean {
  if (config.flags.useMockClassifier) return false;
  if (config.intentClassifier.provider === "anthropic")
    return config.intentClassifier.anthropic.apiKey !== "";
  if (config.intentClassifier.provider === "gemini")
    return config.intentClassifier.gemini.apiKey !== "";
  if (config.intentClassifier.provider === "aimlapi")
    return config.intentClassifier.aimlApiKey !== "";
  return false;
}
