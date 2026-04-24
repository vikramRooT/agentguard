"""Minimal example: research agent buys a data report from a vendor agent.

Prerequisites:
    pnpm infra:up
    pnpm dev:api    # in another terminal
    pnpm seed       # register demo agents
    pip install -e apps/sdk/python
"""
from __future__ import annotations

from agentguard import AgentGuard


def main() -> None:
    with AgentGuard(
        agent_id="research-agent-v1",
        policy_file="policies/research-agent-v1.yaml",
        api_base_url="http://localhost:4000",
    ) as guard:
        receipt = guard.pay(
            to_agent_id="data-vendor-agent-v1",
            amount_usdc=0.001,
            intent="Buy Q3 macro stats report for this week's brief",
            original_task_id="brief-2026-w17",
        )

        if receipt.approved:
            print(f"[OK] settled {receipt.amount_usdc} USDC")
            print(f"     arc tx:    {receipt.arc_tx_hash}")
            print(f"     audit tx:  {receipt.audit_tx_hash}")
            print(f"     latency:   {receipt.latency_ms:.0f} ms")
        else:
            print(f"[BLOCK] {receipt.reason}")
            for step in receipt.trace:
                flag = "pass" if step.passed else "fail"
                print(f"    {step.layer:<12} {flag} -- {step.reason}")


if __name__ == "__main__":
    main()
