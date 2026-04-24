# AgentGuard contracts

## What's here

[`src/`](src/) holds the Vyper contracts AgentGuard depends on. These are
**vendored from sponsor-provided reference implementations**, with provenance
recorded below so they can be re-synced if upstream changes:

| Contract | Source | Purpose |
|---|---|---|
| `IdentityRegistry.vy`  | [vyperlang/erc-8004-vyper](https://github.com/vyperlang/erc-8004-vyper) | ERC-8004 agent identity. ERC-721 NFT per agent, EIP-712 wallet binding, metadata storage. |
| `ReputationRegistry.vy` | same repo | Agent feedback + reputation scores. |
| `ValidationRegistry.vy` | same repo | Validation request/response lifecycle (designated validators). |
| `SpendingLimiter.vy`    | [vyperlang/vyper-agentic-payments](https://github.com/vyperlang/vyper-agentic-payments) | On-chain spending guardrails (per-tx / daily / total caps). Maps to AgentGuard's policy engine at the contract level. |
| `interfaces/`          | erc-8004-vyper | Shared Vyper interface definitions. |

## Deployment plan (Day 3)

1. Install Vyper + Titanoboa + Moccasin into the project venv.
2. Compile all four contracts.
3. Deploy `IdentityRegistry.vy` to Arc Testnet. Record address in `.env`
   under `ARC_ERC8004_IDENTITY_REGISTRY`.
4. Deploy `ReputationRegistry.vy` and `ValidationRegistry.vy`. Record addresses.
5. Deploy `SpendingLimiter.vy` with `usdc_address = 0x3600000000000000000000000000000000000000`
   (Arc Testnet USDC). Record address under `ARC_AGENTGUARD_SPENDING_LIMITER`.
6. Update the API's `erc8004_identity.ts` and `policy_engine.ts` to call the
   deployed contracts via `viem` / raw RPC instead of returning stubs.

## Why we vendor rather than install as a package

- The sponsors publish these as standalone Vyper contracts, not as installable
  packages — there's no pip module to import.
- Vendoring keeps our deployment reproducible: we know exactly what version
  of each contract we deployed.
- Re-syncing is `cp -r vendor/<repo>/contracts/*.vy contracts/src/`.

## Not deployed by AgentGuard

- **Circle Nanopayments / Gateway contracts** are already deployed on Arc
  Testnet (`0x0077...19B9` Gateway Wallet, `0x0022...275B` Gateway Minter).
- **USDC** contract (`0x3600...0000`) is already deployed.
- **CCTP V2** contracts are already deployed (see `.env.example`).

## Deploy script stub

See `script/deploy.py` for the Moccasin-based deployment stub. Day-3 work
fills in the actual calls.
