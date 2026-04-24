/**
 * One-time setup: generate a 32-byte Entity Secret, encrypt it with Circle's
 * RSA public key, register the ciphertext via the Circle API, and save the
 * recovery file Circle returns.
 *
 * Reads:  CIRCLE_API_KEY from .env
 * Writes: CIRCLE_ENTITY_SECRET back into .env (replacing any empty value)
 *         recovery file to ./secrets/ (gitignored; back up offline too)
 *
 * Never prints the raw secret to stdout — only a redacted prefix, so this
 * transcript does not contain recoverable credentials.
 *
 * Usage: pnpm --filter @agentguard/scripts exec tsx register-entity-secret.ts
 *
 * Docs: https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet#register-an-entity-secret-ciphertext
 */
import crypto from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SECRETS_DIR = join(REPO_ROOT, "secrets");
const ENV_PATH = join(REPO_ROOT, ".env");

// Load .env from the repo root regardless of CWD.
dotenv.config({ path: ENV_PATH });

function redactPrefix(s: string): string {
  if (s.length <= 8) return "***";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function replaceEnvLine(envText: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(envText)) {
    return envText.replace(re, `${key}=${value}`);
  }
  return envText.replace(/\s*$/, "") + `\n${key}=${value}\n`;
}

async function main(): Promise<void> {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey || apiKey === "" || apiKey.includes("replace")) {
    console.error("error: CIRCLE_API_KEY is not set in .env");
    process.exit(1);
  }
  if (!apiKey.startsWith("TEST_API_KEY:") && !apiKey.startsWith("LIVE_API_KEY:")) {
    console.error(
      "error: CIRCLE_API_KEY looks malformed. Expected TEST_API_KEY: or LIVE_API_KEY: prefix.",
    );
    process.exit(1);
  }
  if (process.env.CIRCLE_ENTITY_SECRET && process.env.CIRCLE_ENTITY_SECRET.trim()) {
    console.error(
      "error: CIRCLE_ENTITY_SECRET is already set in .env. Refusing to overwrite.\n" +
        "  If you really mean to rotate, clear that line first and re-run.",
    );
    process.exit(1);
  }

  mkdirSync(SECRETS_DIR, { recursive: true });
  let envText: string;
  try {
    envText = readFileSync(ENV_PATH, "utf8");
  } catch {
    console.error(`error: could not read ${ENV_PATH}. Create .env first.`);
    process.exit(1);
  }

  const entitySecret = crypto.randomBytes(32).toString("hex");

  console.log("registering entity secret with Circle...");
  console.log(`  api key:      ${redactPrefix(apiKey)}`);
  console.log(`  secret (hex): ${redactPrefix(entitySecret)}   [full value NOT printed]`);
  console.log(`  recovery dir: ${SECRETS_DIR}`);

  await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: SECRETS_DIR,
  });

  const updated = replaceEnvLine(envText, "CIRCLE_ENTITY_SECRET", entitySecret);
  writeFileSync(ENV_PATH, updated, "utf8");

  console.log();
  console.log("ok. CIRCLE_ENTITY_SECRET written to .env.");
  console.log("the recovery file under ./secrets/ is your ONLY backup —");
  console.log("copy it somewhere offline (USB, 1Password, etc.) before proceeding.");
}

main().catch((err) => {
  console.error("registration failed:");
  console.error(err);
  process.exit(1);
});
