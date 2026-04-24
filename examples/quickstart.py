"""AgentGuard quickstart — the 3-line integration, end-to-end.

Shows the happy path and the blocked path side-by-side so you can see
what a PaymentReceipt looks like in both cases.

Prereqs:
    pnpm infra:up
    pnpm dev:api
    pnpm seed
    pip install agentguard-protocol
"""
from __future__ import annotations

from agentguard import AgentGuard, PaymentBlocked


def main() -> None:
    # 1. Construct. Policy is loaded from YAML; auto-register ensures the
    #    API knows this agent exists.
    guard = AgentGuard(
        agent_id="research-agent-v1",
        policy_file="policies/research-agent-v1.yaml",
        api_base_url="http://localhost:4000",
    )

    # 2. Happy path — a legitimate A2A payment. Passes all 5 layers
    #    (kill switch, identity, policy, anomaly, intent) and settles as
    #    a USDC Nanopayment on Arc.
    receipt = guard.pay(
        to_agent_id="data-vendor-agent-v1",
        amount_usdc=0.001,
        intent="Buy Q3 macro stats report for this week's brief",
        original_task_id="brief-2026-w17",
    )
    _print_receipt("happy path", receipt)

    # 3. Blocked path — amount above per-tx limit. The client-side
    #    quick_check fails fast AND the server confirms the decision.
    receipt = guard.pay(
        to_agent_id="data-vendor-agent-v1",
        amount_usdc=50.0,  # policy caps per-tx at 5 USDC
        intent="Testing the limit",
    )
    _print_receipt("over-limit", receipt)

    # 4. Strict mode — raise instead of returning a blocked receipt.
    try:
        guard.pay(
            to_agent_id="unknown-agent",  # not on allowlist
            amount_usdc=0.001,
            intent="Testing allowlist",
            strict=True,
        )
    except PaymentBlocked as exc:
        print(f"\n[strict mode] PaymentBlocked raised: {exc}")

    guard.close()


def _print_receipt(label: str, receipt) -> None:
    print(f"\n--- {label} ---")
    print(f"decision:  {receipt.decision.value}")
    print(f"approved:  {receipt.approved}")
    print(f"amount:    {receipt.amount_usdc} USDC")
    if receipt.arc_tx_hash:
        print(f"arc tx:    {receipt.arc_tx_hash}")
        print(f"audit tx:  {receipt.audit_tx_hash}")
    print(f"latency:   {receipt.latency_ms:.0f} ms")
    if not receipt.approved:
        print(f"reason:    {receipt.reason}")
        for step in receipt.trace:
            flag = "pass" if step.passed else "FAIL"
            print(f"  {step.layer:<12} {flag}  {step.reason}")


if __name__ == "__main__":
    main()
