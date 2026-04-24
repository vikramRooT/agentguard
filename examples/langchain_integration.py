"""AgentGuard as a LangChain `StructuredTool`.

Any LangChain agent that gets this tool can make governed payments. Every
invocation goes through the AgentGuard pipeline; blocked payments return
a structured error the LLM can reason about (escalate to human, rephrase,
etc.).

Install: ``pip install agentguard-protocol langchain langchain-anthropic``

This example uses Claude via langchain-anthropic but any chat model works.
"""
from __future__ import annotations

from typing import Literal

from agentguard import AgentGuard, PaymentReceipt

# LangChain imports kept lazy so this file parses even without LangChain
# installed — examples/README.md lists the install extra.
try:
    from langchain_core.tools import StructuredTool
    from pydantic import BaseModel, Field
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "install langchain to run this example:  pip install langchain langchain-core"
    ) from exc


class PayInput(BaseModel):
    to_agent_id: str = Field(..., description="recipient agent ID, e.g. 'data-vendor-agent-v1'")
    amount_usdc: float = Field(..., gt=0, description="payment amount in USDC")
    intent: str = Field(..., description="human-readable reason for the payment")


def make_pay_tool(guard: AgentGuard, *, task_id: str) -> StructuredTool:
    """Expose ``guard.pay`` as a StructuredTool the agent can call."""

    def _pay(to_agent_id: str, amount_usdc: float, intent: str) -> dict:
        receipt: PaymentReceipt = guard.pay(
            to_agent_id=to_agent_id,
            amount_usdc=amount_usdc,
            intent=intent,
            original_task_id=task_id,
        )
        return _format_for_llm(receipt)

    return StructuredTool.from_function(
        func=_pay,
        name="pay",
        description=(
            "Make a USDC payment to another AI agent through the AgentGuard "
            "governance layer. Every payment is checked against policy, "
            "identity (ERC-8004), anomaly baselines, and intent alignment. "
            "Returns status='approved' with a tx hash OR status='blocked' "
            "with a reason — if blocked, do NOT retry the same payment."
        ),
        args_schema=PayInput,
    )


def _format_for_llm(receipt: PaymentReceipt) -> dict:
    """Compact, agent-friendly shape. Full trace lives on the dashboard."""
    status: Literal["approved", "blocked", "escalated"] = (
        "approved" if receipt.approved else receipt.decision.value  # type: ignore[assignment]
    )
    return {
        "status": status,
        "request_id": receipt.request_id,
        "arc_tx": receipt.arc_tx_hash,
        "audit_tx": receipt.audit_tx_hash,
        "amount_usdc": receipt.amount_usdc,
        "reason": receipt.reason,
    }


def main() -> None:
    guard = AgentGuard(
        agent_id="research-agent-v1",
        policy_file="policies/research-agent-v1.yaml",
        api_base_url="http://localhost:4000",
    )
    pay_tool = make_pay_tool(guard, task_id="brief-2026-w17")

    # Direct invocation (no LLM needed to test the tool itself):
    result = pay_tool.invoke(
        {
            "to_agent_id": "data-vendor-agent-v1",
            "amount_usdc": 0.001,
            "intent": "Buy Q3 macro stats report",
        }
    )
    print(result)

    # To plug this into a real LangChain agent:
    #
    #   from langchain.agents import create_tool_calling_agent, AgentExecutor
    #   from langchain_anthropic import ChatAnthropic
    #
    #   llm = ChatAnthropic(model="claude-haiku-4-5-20251001")
    #   agent = create_tool_calling_agent(llm, [pay_tool], prompt)
    #   executor = AgentExecutor(agent=agent, tools=[pay_tool])
    #   executor.invoke({"input": "Buy the Q3 macro report from data-vendor-agent-v1 for $0.001"})

    guard.close()


if __name__ == "__main__":
    main()
