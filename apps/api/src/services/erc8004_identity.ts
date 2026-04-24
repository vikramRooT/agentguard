import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { logger } from "../logger.js";

/**
 * ERC-8004 identity verification for autonomous agents.
 *
 * Reads the on-chain IdentityRegistry (ERC-721 + wallet metadata) deployed on
 * Arc Testnet. Agents that haven't registered on-chain still resolve, just
 * with a `reason` explaining they're un-verified.
 *
 * Two registry functions we call:
 *   balanceOf(owner) -> uint256   (0x70a08231)
 *   tokenOfOwnerByIndex(owner, i) -> uint256   (0x2f745c59)
 *
 * We don't cache aggressively because an agent's identity status can change
 * (revocation, new registration). 100ms per payment is acceptable; we'll
 * move to a cache only if that becomes a bottleneck.
 */

export interface IdentityCheck {
  ok: boolean;
  agent_id: string;
  identity: string | null;
  reputation_score?: number;
  reason: string;
  on_chain?: boolean;
  registry_address?: string;
  agent_token_id?: string;
}

const BALANCE_OF_SELECTOR = "0x70a08231";
const TOKEN_OF_OWNER_SELECTOR = "0x2f745c59";

function registryConfigured(): boolean {
  return Boolean(config.arc.rpcUrl) && Boolean(process.env.ARC_ERC8004_IDENTITY_REGISTRY);
}

async function ethCall(to: string, data: string): Promise<string> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to, data }, "latest"],
  };
  const res = await fetch(config.arc.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`arc rpc ${res.status}`);
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "rpc error");
  return json.result ?? "0x0";
}

function padAddress(addr: string): string {
  return addr.startsWith("0x") ? addr.slice(2).toLowerCase().padStart(64, "0") : "";
}

function padUint(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

// Per-wallet identity cache. ERC-8004 identities rarely change (registration
// happens once, revocation is rare) — a 60s TTL keeps the pipeline well under
// 100ms on the happy path while still catching new registrations within a
// minute for the demo.
interface IdentityCacheEntry {
  tokenId: string | null;
  balance: bigint;
  expiresAt: number;
}
const identityCache = new Map<string, IdentityCacheEntry>();
const IDENTITY_CACHE_TTL_MS = 60_000;

async function lookupOnChainIdentity(
  walletAddress: string,
): Promise<{ tokenId: string | null; balance: bigint }> {
  const key = walletAddress.toLowerCase();
  const cached = identityCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return { tokenId: cached.tokenId, balance: cached.balance };
  }

  const registry = process.env.ARC_ERC8004_IDENTITY_REGISTRY ?? "";
  const paddedOwner = padAddress(walletAddress);
  const balanceData = BALANCE_OF_SELECTOR + paddedOwner;
  const balanceHex = await ethCall(registry, balanceData);
  const balance = BigInt(balanceHex || "0x0");
  if (balance === 0n) {
    identityCache.set(key, { tokenId: null, balance, expiresAt: now + IDENTITY_CACHE_TTL_MS });
    return { tokenId: null, balance };
  }

  const tokenData = TOKEN_OF_OWNER_SELECTOR + paddedOwner + padUint(0n);
  const tokenHex = await ethCall(registry, tokenData);
  const tokenId = BigInt(tokenHex || "0x0").toString();
  identityCache.set(key, { tokenId, balance, expiresAt: now + IDENTITY_CACHE_TTL_MS });
  return { tokenId, balance };
}

export function deriveIdentity(agent_id: string, wallet: string): string {
  return `erc8004:${agent_id}:${wallet.slice(0, 10)}`;
}

export async function verifySenderIdentity(
  agent_id: string,
  walletAddress: string | null | undefined,
): Promise<IdentityCheck> {
  if (!walletAddress) {
    return {
      ok: false,
      agent_id,
      identity: null,
      reason: "sender has no wallet address on record",
    };
  }

  if (!registryConfigured()) {
    return {
      ok: true,
      agent_id,
      identity: deriveIdentity(agent_id, walletAddress),
      reputation_score: 1.0,
      reason: "identity stub (IdentityRegistry not configured)",
      on_chain: false,
    };
  }

  try {
    const { tokenId, balance } = await lookupOnChainIdentity(walletAddress);
    if (tokenId === null) {
      return {
        ok: true, // don't block un-registered agents; we flag instead
        agent_id,
        identity: deriveIdentity(agent_id, walletAddress),
        reason: "sender not yet registered in on-chain IdentityRegistry",
        on_chain: false,
        registry_address: process.env.ARC_ERC8004_IDENTITY_REGISTRY,
      };
    }
    return {
      ok: true,
      agent_id,
      identity: `erc8004:${agent_id}:${walletAddress.slice(0, 10)}:token:${tokenId}`,
      reputation_score: 1.0,
      reason: `on-chain identity verified (token ${tokenId}, balance ${balance})`,
      on_chain: true,
      registry_address: process.env.ARC_ERC8004_IDENTITY_REGISTRY,
      agent_token_id: tokenId,
    };
  } catch (exc) {
    logger.warn({ err: exc, walletAddress }, "erc8004 lookup failed");
    return {
      ok: true,
      agent_id,
      identity: deriveIdentity(agent_id, walletAddress),
      reason: `on-chain lookup error: ${(exc as Error).message}`,
      on_chain: false,
    };
  }
}

export async function verifyRecipientIdentity(
  recipient_id: string | undefined | null,
  recipient_wallet?: string | null,
): Promise<IdentityCheck> {
  if (!recipient_id && !recipient_wallet) {
    return {
      ok: true,
      agent_id: "(external)",
      identity: null,
      reason: "external wallet — no agent identity required",
    };
  }
  if (recipient_wallet && registryConfigured()) {
    try {
      const { tokenId, balance } = await lookupOnChainIdentity(recipient_wallet);
      if (tokenId) {
        return {
          ok: true,
          agent_id: recipient_id ?? "(external)",
          identity: `erc8004:${recipient_id}:${recipient_wallet.slice(0, 10)}:token:${tokenId}`,
          reputation_score: 1.0,
          reason: `recipient has on-chain identity (token ${tokenId})`,
          on_chain: true,
          registry_address: process.env.ARC_ERC8004_IDENTITY_REGISTRY,
          agent_token_id: tokenId,
        };
      }
      return {
        ok: true,
        agent_id: recipient_id ?? "(external)",
        identity: deriveIdentity(recipient_id ?? "external", recipient_wallet),
        reason: "recipient not yet registered on-chain",
        on_chain: false,
      };
    } catch (exc) {
      // Fall through to soft-pass
    }
  }
  return {
    ok: true,
    agent_id: recipient_id ?? "(wallet address)",
    identity: recipient_id
      ? deriveIdentity(recipient_id, recipient_wallet ?? "0x0")
      : null,
    reason: "recipient identity accepted (off-chain)",
  };
}

export function mintIdentityForDemo(agent_id: string): string {
  const salt = randomUUID().slice(0, 8);
  return `erc8004:${agent_id}:${salt}`;
}
