# AgentGuard

**The governance layer for autonomous agent payments on Circle Nanopayments.**

Every payment an AI agent makes flows through AgentGuard — we verify the sender's identity via ERC-8004, enforce the owner's policies, settle the payment as a USDC Nanopayment on Arc, write the decision to an on-chain audit log, and detect attacks in real time. Agents plug in with three lines of SDK code; everything else is handled.

Submission for the **Agentic Economy on Arc** hackathon (Apr 20–26, 2026) · Agent-to-Agent Payment Loop track.

## Quickstart

Two payment modes — the real Circle Nanopayments path and a legacy A2A path
for demos without on-chain settlement.

### (A) Real Circle Nanopayments (recommended)

```python
from agentguard import AgentGuard

guard = AgentGuard(
    agent_id="research-agent-v1",
    policy_file="policies/research-agent-v1.yaml",
    api_base_url="http://localhost:4000",
    private_key="0x...",           # Arc Testnet key with USDC from faucet.circle.com
)

# Agent pays an x402-protected endpoint; Circle Gateway batches settlement.
receipt = guard.pay_for_service(
    url="https://vendor-agent.local/api/analyze",
    intent="Run analysis for weekly brief",
    expected_max_usdc=0.10,
)

if receipt.approved:
    print(f"Settled on Arc: {receipt.arc_tx_hash}")
    print(f"Audit commit:   {receipt.audit_tx_hash}")
```

### (B) Legacy A2A (useful for tests without testnet USDC)

```python
receipt = guard.pay(
    to_agent_id="data-vendor-agent-v1",
    amount_usdc=0.001,
    intent="Buy Q3 macro stats report for weekly brief",
)
```

Install the Circle extras for the real path:

```bash
pip install -e apps/sdk/python[circle]
```

## What's in the box

1. **Governed payment SDK** — `agentguard.pay_for_service(url)` (real Circle Nanopayments via `circlekit`) or `agentguard.pay(to_agent_id=...)` (A2A).
2. **Identity layer (ERC-8004)** — vendored `IdentityRegistry.vy` in [contracts/src/](contracts/src/). Agents register as ERC-721 NFTs with metadata + wallet binding.
3. **Policy engine** — YAML config off-chain, mirrored by on-chain `SpendingLimiter.vy` for enforceable guardrails.
4. **On-chain audit log** — decision bodies hashed; Merkle roots committed on Arc via Gateway batching (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
5. **Incident detection** — anomaly scoring + intent classification (Claude Haiku 4.5 or Gemini Flash).
6. **Operator dashboard** — live payment volume, incident feed, kill switch, agent directory.

## Repo layout

```
agentguard/
├── apps/
│   ├── sdk/python/          # pip install -e apps/sdk/python[circle]
│   ├── api/                 # Node + Express governance engine
│   └── web/                 # Next.js operator dashboard
├── scripts/
│   ├── seed-wallets.ts      # register demo agents
│   ├── agent-economy.ts     # live A2A traffic simulator (~1 tx/sec)
│   ├── demo-attack.ts       # hero A2A attack scenario
│   ├── evaluate-classifier.ts # run 20-sample injection eval
│   └── attacks/             # 5 additional attack scripts
├── contracts/
│   ├── src/                 # Vendored Vyper contracts ready to deploy
│   └── script/deploy.py     # Titanoboa-based Arc testnet deploy
├── vendor/                  # Read-only sponsor reference repos
├── docs/                    # architecture, policy language, Circle feedback
├── examples/                # legitimate_payment.py, pay_for_service.py
├── tests/                   # injection eval suite (20 samples)
└── AGENTGUARD_BUILD_DOC.md  # full product specification
```

## Local development

```bash
# 1. Install deps
pnpm install
cd apps/sdk/python && pip install -e . && cd -

# 2. Environment
cp .env.example .env
# Fill in CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, ANTHROPIC_API_KEY

# 3. Bring up Postgres + Redis
pnpm infra:up

# 4. Seed demo wallets on Arc testnet
pnpm seed

# 5. Start API + web
pnpm dev

# 6. Fire the live traffic simulator and/or the hero attack
pnpm sim           # continuous A2A payments
pnpm demo:attack   # the hero scenario
```

Visit `http://localhost:3000/dashboard` for the operator dashboard.

## Hackathon submission notes

- **Per-action pricing:** $0.0001 USDC per governance check (≤$0.01 requirement met).
- **On-chain transactions:** every check writes a nanopayment — a single demo run generates 100+ tx on Arc.
- **Margin story:** logging every agent decision on any traditional payment rail would cost $1.5M/day at volume; on Circle Nanopayments it is zero settlement cost.
- **Track:** Agent-to-Agent Payment Loop.

See [AGENTGUARD_BUILD_DOC.md](AGENTGUARD_BUILD_DOC.md) for the complete product specification, unit economics, and demo script.
