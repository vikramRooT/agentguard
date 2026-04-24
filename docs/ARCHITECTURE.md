# Architecture

## What AgentGuard is

**The governance layer for autonomous agent payments on Circle Nanopayments.**
Every time an AI agent tries to spend, AgentGuard sits between the agent and
its wallet / payment rail. It runs five layers of checks, writes a decision
trace on-chain, and either allows settlement to proceed or blocks/escalates.

```
  ┌────────────────────┐                                 ┌──────────────────────────┐
  │  Autonomous        │   agent.pay() / pay_for_service │   Operator Dashboard     │
  │  AI agent          │─────────────────────┐           │  (Next.js, WS live feed) │
  └────────────────────┘                     │           └──────────────────────────┘
                                             ▼                       ▲
                                  ┌──────────────────────┐            │ WS events
                                  │    AgentGuard API    │ ───────────┘
                                  │    (Node/Express)    │
                                  │                      │
                                  │  ▸ kill-switch       │
                                  │  ▸ ERC-8004 identity │
                                  │  ▸ policy engine     │
                                  │  ▸ anomaly detector  │
                                  │  ▸ intent classifier │──── Claude / Gemini
                                  │  ▸ audit writer ─────┼──▶ Arc batched receipt
                                  └──────────────────────┘
                                        │
                                        ▼ decision
                                  ┌────────────────────────┐
                                  │  Python SDK `circlekit` │ ──▶ Circle Gateway API
                                  │  (x402 buyer / seller) │     (EIP-712 batched)
                                  └────────────────────────┘       ▼
                                                             Arc Testnet settlement
                                                             (USDC, gas-free)
```

## Pipeline order

Every governed payment runs these layers in sequence. Cheap-and-deterministic
first; expensive-AI last.

1. **Kill-switch** — is this agent paused? If yes, block immediately.
2. **ERC-8004 identity** — is the sender registered in the on-chain registry
   and not revoked? Is the recipient (if another agent) valid too?
3. **Policy engine** — YAML rules: spending limits, allowlist, category,
   approval rules. Mirrors `SpendingLimiter.vy` on-chain.
4. **Anomaly engine** — z-score of amount against the (agent × recipient)
   baseline; new-recipient heuristic; daily spend check.
5. **Intent classifier** — Claude Haiku 4.5 (default) or Gemini 3 Flash;
   classifies "aligned / suspicious / malicious" against the stated intent.
   Fires only when earlier layers are ambiguous or policy sensitivity is high,
   so most traffic doesn't pay the LLM latency/cost.
6. **Audit write** — decision + trace hashed and committed on-chain (see
   "Audit model" below for the batched-commitment scheme).
7. **Settlement** — if approved, the Python SDK executes the real payment via
   `circlekit.GatewayClient.pay(url)` (Circle Nanopayments). No duplicate
   USDC transfer — AgentGuard gates, it doesn't custody.

## How Circle Nanopayments actually works

Nanopayments = **Circle Gateway + x402 batching**. The mental model is:

1. Buyer signs an EIP-712 `TransferWithAuthorization` off-chain — free, instant.
2. Gateway aggregates many such signatures.
3. Gateway settles the batch on Arc in bulk. Neither buyer nor seller pays
   per-transaction gas.
4. Each payment is individually provable by its EIP-712 hash even though
   it wasn't its own on-chain tx.

**Implications for AgentGuard's design:**
- "100+ on-chain tx per demo" means 100+ signed authorizations, settled in
  some smaller number of Arc batches. Every payment is provable, just not
  1-block-per-payment.
- "Every decision on-chain" cannot mean a per-decision tx. We use a
  batched-commitment audit model (next section).
- Gateway has no "wallet-A → wallet-B transfer" primitive. A2A in
  Nanopayments terms = **Agent A pays for Agent B's x402-protected
  endpoint** — more authentic than raw USDC transfers.

## Audit model

Per-decision on-chain writes are not viable under Gateway's batched model.
Instead, AgentGuard maintains a **commitment-tree audit**:

- Each decision produces a deterministic JSON body. We compute
  `body_hash = sha256(body)` and store the body in Postgres / memstore.
- Every N decisions (or every T seconds), we compute a Merkle root of
  recent `body_hash` values and commit that root on-chain via either:
  - A small self-directed USDC transfer memo (cheap, short memo), OR
  - A storage write to a minimal "audit root" Vyper contract we deploy alongside
    `SpendingLimiter.vy`.
- A single Arc tx therefore anchors many governance decisions; any individual
  decision can be proven against the root by its Merkle proof.

This is honest about Gateway's batching reality while preserving the
"every decision is cryptographically anchored on-chain" claim.

## Two payment modes in the SDK

The Python SDK exposes both:

1. `guard.pay(to_agent_id=..., amount_usdc=...)` — legacy A2A path. The API
   runs the governance pipeline; settlement is mocked unless the server
   explicitly wires a direct USDC transfer. Good for demos where "agent A
   transfers USDC to agent B" is the narrative.
2. `guard.pay_for_service(url=...)` — real Nanopayments. Governance runs
   server-side, then the SDK calls `circlekit.GatewayClient.pay(url)` to do
   the real EIP-712 + Gateway batched settlement. This is the path we
   advocate for production.

## Why nanopayments are load-bearing

Logging every governance decision via on-chain per-tx writes would cost:
- Stripe: $0.30 × 5M/day = $1.5M/day — impossible.
- L2 gas: ~$0.01 × 5M/day = $50K/day — impossible.
- Solana: ~$0.00025 × 5M/day = $1,250/day — eats margin.
- Circle Nanopayments (batched): $0 — works.

Only Gateway's batched model makes "governance on every payment" economically
viable at agent-economy scale. Remove that primitive and either we lose the
audit moat or we operate at a loss.

## Data model

- `agents` — one row per registered agent. Policy, Circle wallet ID, ERC-8004
  identity (agent token ID), pause state.
- `payments` — one row per governance call. Decision, trace, evidence,
  arc_tx_hash (when approved + settled), audit_tx_hash (batch root), latency.
- `incidents` — one row per blocked/escalated decision. Projection of
  `payments` filtered to non-approved outcomes.
- `anomaly_baseline` — Welford-maintained running mean + variance per
  (agent × recipient).
- `audit_log` — each governance decision body. Replaced by Merkle root
  commitments on-chain.

## Where the code lives

- [apps/sdk/python/agentguard](../apps/sdk/python/agentguard) — the SDK
  users import. `core.py` is the facade; `circle.py` wraps `circlekit`.
- [apps/api/src/services/pipeline.ts](../apps/api/src/services/pipeline.ts)
  — the single orchestrator. Start here when reading the code.
- [apps/api/src/services](../apps/api/src/services) — one service per
  pipeline layer.
- [apps/web/app/dashboard/page.tsx](../apps/web/app/dashboard/page.tsx)
  — the operator UI that fills with live payments.
- [contracts/src](../contracts/src) — Vendored Vyper sources
  (`IdentityRegistry`, `ReputationRegistry`, `ValidationRegistry`,
  `SpendingLimiter`). Deployed via [contracts/script/deploy.py](../contracts/script/deploy.py).
- [scripts/](../scripts) — seed, live simulator, demo attacks.
- [vendor/](../vendor) — clones of sponsor reference repos
  (erc-8004-vyper, vyper-agentic-payments, circle-titanoboa-sdk,
  AIsa/nanopayment-x402). Read-only reference.
