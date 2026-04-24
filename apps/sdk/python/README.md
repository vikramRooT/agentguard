# agentguard-protocol

**The governance layer for autonomous AI agent payments.**

```bash
pip install agentguard-protocol
```

Every `.pay()` call runs through five deterministic layers — kill switch,
ERC-8004 identity, policy, anomaly, Claude-powered intent — before settling
as a USDC Nanopayment on [Arc](https://www.circle.com/arc) and writing an
on-chain audit receipt. Three lines of SDK code replaces a raw Circle
Wallets transfer, and the agent can't bypass the governance layer without
replacing the keys.

[![PyPI](https://img.shields.io/pypi/v/agentguard-protocol.svg)](https://pypi.org/project/agentguard-protocol/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why this exists

In 2026, AI agents will handle money. The current options are both wrong:

- **Give the agent raw wallet keys** — no limits, no audit, one prompt
  injection away from a drained treasury.
- **Human-in-the-loop every payment** — kills the autonomy the agent was
  built for, doesn't scale to sub-cent operational payments.

AgentGuard sits between the agent and the rail. The agent gets autonomy.
The operator gets a policy file, an audit log, and a kill switch.

## Three-line integration

```python
from agentguard import AgentGuard

guard = AgentGuard(
    agent_id="research-agent-v1",
    policy_file="policies/research-agent-v1.yaml",
    api_base_url="http://localhost:4000",
)

receipt = guard.pay(
    to_agent_id="data-vendor-agent-v1",
    amount_usdc=0.001,
    intent="Buy Q3 macro stats report",
    original_task_id="brief-2026-w17",
)

if receipt.approved:
    print(f"settled {receipt.amount_usdc} USDC — arc tx: {receipt.arc_tx_hash}")
else:
    print(f"blocked: {receipt.reason}")
```

## What runs on every `.pay()`

| Layer | What it does | Typical latency |
| --- | --- | --- |
| **Kill switch** | Is this agent paused by the operator? | <2 ms |
| **ERC-8004 identity** | Do sender + recipient have valid on-chain identities? | 0.1 ms (cached) |
| **Policy** | YAML rules — spending caps, allowlists, category filters, approval thresholds. | 5 ms |
| **Anomaly** | z-score over the agent's payment history — amount, recipient novelty, frequency. | 3 ms |
| **Intent** | Claude Haiku 4.5 classifies the intent as `aligned` / `suspicious` / `malicious`. Only fires when earlier layers flag ambiguity. | 300–800 ms |
| **Settlement** | USDC Nanopayment on Arc Testnet. | 400 ms |
| **Audit** | Second nanopayment — decision trace with tx hash. | 400 ms |

A blocked payment never settles. An approved payment settles and logs a
receipt. Either way, the full trace is on-chain.

## Install

The base SDK:

```bash
pip install agentguard-protocol
```

With real Circle Gateway + x402 settlement (pulls in `circle-titanoboa-sdk`):

```bash
pip install "agentguard-protocol[circle]"
```

For development (tests, linting):

```bash
pip install "agentguard-protocol[dev]"
```

## Running the governance API

The SDK is a client — it talks to the AgentGuard governance API that runs
the actual pipeline. You host the API yourself:

```bash
git clone https://github.com/agentguard/agentguard
cd agentguard
pnpm install
pnpm infra:up            # Postgres + Redis via docker compose
pnpm dev:api             # Node API on :4000
pnpm seed                # register demo agents
```

Then point the SDK at `http://localhost:4000`. Full deployment guide:
[/docs/self-hosting.md](https://github.com/agentguard/agentguard/blob/main/docs/self-hosting.md).

## API reference

### `AgentGuard(agent_id, policy_file=..., policy=..., api_base_url=..., api_key=..., auto_register=True, private_key=None, circle_wallet_id=None, circle_wallet_address=None, chain="arcTestnet")`

| Arg | Required | Description |
| --- | --- | --- |
| `agent_id` | yes | Stable ID used by the API to look up history + policy. |
| `policy_file` or `policy` | yes | Path to a YAML policy, or a `Policy` instance. |
| `api_base_url` | no | AgentGuard API URL. Default `http://localhost:4000`. |
| `api_key` | no | Bearer token, sent on every request. |
| `auto_register` | no | POST agent + policy to `/v1/agents/{id}` on construct. Default `True`. |
| `private_key` | no | EOA key for x402 payments via `CircleGatewaySettler`. |
| `circle_wallet_id`, `circle_wallet_address` | no | Use a Circle Developer-Controlled Wallet for settlement instead of an EOA. Preferred — keys never touch your process. |
| `chain` | no | `"arcTestnet"` (default) or `"arc"`. |

### `.pay(*, to_agent_id=None, to_wallet_address=None, amount_usdc, intent, original_task_id=None, context=None, strict=False) -> PaymentReceipt`

The primary A2A transfer. Exactly one of `to_agent_id` / `to_wallet_address`
is required. `intent` is free-form — used by the intent classifier and
surfaced on the dashboard.

When `strict=True`, non-approvals raise `PaymentBlocked`. Otherwise a
`PaymentReceipt` is returned with `approved=False`.

### `.pay_for_service(*, url, intent, expected_max_usdc=10.0, ...) -> PaymentReceipt`

Pay an x402-protected HTTP endpoint. Runs the governance pipeline, then —
if approved and `circlekit` is installed — actually settles via Circle
Gateway. Receipt's `.evidence["settlement"]` carries the on-chain proof.

### `.escalate(receipt)`

Flag a blocked receipt for human review via the API.

### `.balances() -> dict | None`

Returns wallet + Gateway balances if a settler is configured, else `None`.

### `.close()` / context manager

```python
with AgentGuard(...) as guard:
    guard.pay(...)
# client + settler closed automatically
```

## Exceptions

```
AgentGuardError
├── PaymentBlocked           ← catch this for graceful handling
│   ├── PolicyViolation
│   └── WalletPaused
├── IdentityError
└── APIUnavailable
```

All exceptions are only raised when you opt into `strict=True` or when the
API is unreachable. Default behavior is to return a receipt with
`approved=False` and let your code branch on it.

## Policy format

Policies are YAML. The SDK loads them locally for a fast fail-fast check,
and sends the raw dict to the API for authoritative evaluation.

```yaml
agent_id: research-agent-v1
owner_wallet: 0xAcmeCorp

spending_limits:
  per_transaction: 5          # USDC — hard cap per tx
  per_day: 50                 # rolling 24h
  per_recipient_per_day: 10   # per-recipient rolling 24h

recipient_policy:
  type: allowlist
  approved_recipients:
    - data-vendor-agent-v1
    - inference-agent-v1
    - sms-agent-v1
  fallback_action: block      # or: escalate | allow

category_policy:
  allowed: [data_purchase, compute, messaging]
  blocked: [gambling, high_risk_jurisdictions]

intent_verification:
  enabled: true
  sensitivity: medium         # low | medium | high

anomaly_detection:
  enabled: true
  alert_threshold_std_dev: 3.0

approval_rules:
  - if: transaction_amount > 2
    then: require_human_approval
  - if: recipient_is_new AND amount > 1
    then: escalate

kill_switch:
  enabled: true
  authorized_pausers:
    - 0xOperator
    - 0xSecurityLead

audit:
  log_all_checks: true        # every decision writes an on-chain receipt
```

Unknown keys are preserved in `policy.raw` and forwarded to the API, so
you can iterate on the policy engine without bumping the SDK.

## Framework integrations

See [`examples/`](https://github.com/agentguard/agentguard/tree/main/examples):

- **[Claude Agent SDK](https://github.com/agentguard/agentguard/blob/main/examples/claude_agent_sdk_integration.py)** — expose `pay` as an MCP tool.
- **[LangChain](https://github.com/agentguard/agentguard/blob/main/examples/langchain_integration.py)** — `StructuredTool` the agent can call.
- **[AutoGen / direct use](https://github.com/agentguard/agentguard/blob/main/examples/quickstart.py)** — call `guard.pay()` directly.
- **[x402 endpoints](https://github.com/agentguard/agentguard/blob/main/examples/pay_for_service.py)** — pay any x402-protected HTTP service through the pipeline.

## Development

```bash
git clone https://github.com/agentguard/agentguard
cd agentguard/apps/sdk/python
pip install -e ".[dev]"
pytest
ruff check agentguard tests
mypy agentguard
```

35 tests covering the public surface; all mocked, no network or server
required.

## License

MIT © 2026 AgentGuard Protocol contributors.

## Links

- Repo: <https://github.com/agentguard/agentguard>
- Docs: <https://github.com/agentguard/agentguard#readme>
- Issues: <https://github.com/agentguard/agentguard/issues>
- Built for the [Agentic Economy on Arc](https://lablab.ai/event/agentic-economy-on-arc) hackathon (April 2026).
