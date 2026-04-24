/**
 * Generate a throwaway EOA private key for deploying Vyper contracts on Arc.
 *
 * Circle's Developer-Controlled Wallets API doesn't expose arbitrary contract
 * deployment, so we need a raw key the titanoboa `boa.load()` helper can use.
 *
 * Writes ARC_DEPLOYER_PRIVATE_KEY to .env.
 * Prints ONLY the address so nothing sensitive lands in any log.
 *
 * Usage: pnpm --filter @agentguard/scripts exec tsx generate-deployer.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const ENV_PATH = join(REPO_ROOT, ".env");

dotenv.config({ path: ENV_PATH });

function replaceEnvLine(envText: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(envText)) return envText.replace(re, `${key}=${value}`);
  return envText.replace(/\s*$/, "") + `\n${key}=${value}\n`;
}

function main(): void {
  const existing = process.env.ARC_DEPLOYER_PRIVATE_KEY;
  if (existing && existing.trim()) {
    console.error(
      "error: ARC_DEPLOYER_PRIVATE_KEY already set in .env. Refusing to overwrite.",
    );
    console.error("If you really mean to rotate, clear that line first and re-run.");
    process.exit(1);
  }

  const key = generatePrivateKey();
  const address = privateKeyToAddress(key);

  const envText = readFileSync(ENV_PATH, "utf8");
  writeFileSync(ENV_PATH, replaceEnvLine(envText, "ARC_DEPLOYER_PRIVATE_KEY", key), "utf8");

  console.log("generated a fresh throwaway EOA:");
  console.log(`  address: ${address}`);
  console.log();
  console.log("key written to .env (never printed). next steps:");
  console.log("  1. fund this address via https://faucet.circle.com → Arc Testnet");
  console.log(`     (paste: ${address})`);
  console.log("  2. once funded, run: ./.venv/Scripts/python.exe contracts/script/deploy.py");
}

main();
