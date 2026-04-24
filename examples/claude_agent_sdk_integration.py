"""AgentGuard wrapping an agent built with the Claude Agent SDK.

The pattern: expose a single `pay` tool to the agent, and route every
invocation through AgentGuard. If AgentGuard blocks, the tool returns a
structured error to the agent so it can decide to escalate or reword.

This mirrors the three-line integration promise: replace a raw Circle
Wallets transfer with `agentguard.pay(...)`, no other code changes.
"""
from __future__ import annotations

from agentguard import AgentGuard, PaymentReceipt


def build_pay_tool(guard: AgentGuard, task_id: str):
    """Returns a callable that agents can use as their only payment tool."""

    def pay(to_agent_id: str, amount_usdc: float, intent: str) -> dict:
        receipt: PaymentReceipt = guard.pay(
            to_agent_id=to_agent_id,
            amount_usdc=amount_usdc,
            intent=intent,
            original_task_id=task_id,
        )
        return {
            "status": "approved" if receipt.approved else receipt.decision.value,
            "request_id": receipt.request_id,
            "arc_tx": receipt.arc_tx_hash,
            "audit_tx": receipt.audit_tx_hash,
            "reason": receipt.reason,
        }

    return pay


if __name__ == "__main__":
    # Example — in a real Claude Agent SDK app you'd register this tool with
    # the agent runtime. Here we just demonstrate direct use.
    guard = AgentGuard(
        agent_id="research-agent-v1",
        policy_file="policies/research-agent-v1.yaml",
    )
    pay = build_pay_tool(guard, task_id="brief-2026-w17")
    print(pay("data-vendor-agent-v1", 0.001, "Buy Q3 macro stats"))
