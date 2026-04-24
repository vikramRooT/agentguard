# Policy language

Policies are YAML (or JSON) documents describing how an agent may spend.
They live in `policies/` per-agent and are uploaded to AgentGuard during
registration. The Python SDK (`agentguard.policy.Policy.from_yaml`) loads
the same file for client-side fail-fast checks.

## Example

```yaml
agent_id: research-agent-v1
owner_wallet: 0xAcmeCorp

spending_limits:
  per_transaction: 5           # USDC
  per_day: 50
  per_recipient_per_day: 10

recipient_policy:
  type: allowlist              # or "denylist" or "open"
  approved_recipients:
    - data-vendor-agent-v1
    - inference-agent-v1
    - sms-agent-v1
  fallback_action: block       # or "require_human_approval"

category_policy:
  allowed:  [data, inference, notification]
  blocked:  [crypto_transfers, wire_transfers]

anomaly_detection:
  enabled: true
  alert_threshold_std_dev: 3

intent_verification:
  enabled: true
  sensitivity: medium          # low | medium | high

approval_rules:
  - if: transaction_amount > 2
    then: require_human_approval

kill_switch:
  enabled: true
  authorized_pausers:
    - 0xOperator
    - 0xSecurityOps

audit:
  log_all_checks: true
  retention_days: 2555
```

## Semantics

| Section                | Meaning                                                                   |
|------------------------|---------------------------------------------------------------------------|
| `spending_limits`      | Caps enforced by the policy engine before any payment settles.            |
| `recipient_policy`     | Allowlist/denylist + fallback action when a recipient is outside the set. |
| `category_policy`      | Coarse category tags on intent (not required in hackathon build).         |
| `anomaly_detection`    | Toggle + z-score threshold for the anomaly layer.                         |
| `intent_verification`  | Toggle + sensitivity level; "high" invokes the classifier on every call.  |
| `approval_rules`       | Simple `if <cond> then <action>` rules. Currently supports `transaction_amount > N`. |
| `kill_switch`          | List of wallets authorized to pause this agent via the dashboard.         |
| `audit.log_all_checks` | If true, every decision writes an Arc nanopayment.                        |

## SDK side

The Python SDK does a fail-fast *quick check* locally (per-transaction cap +
allowlist fallback=block). Server side is authoritative; the quick check
exists only to save a round trip when the policy clearly forbids the action.
