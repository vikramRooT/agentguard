"""AgentGuard Protocol — governance SDK for AI agent payments.

Three-line integration:

    from agentguard import AgentGuard

    guard = AgentGuard(agent_id="my-agent", policy_file="policy.yaml")
    receipt = guard.pay(to_agent_id="vendor-agent", amount_usdc=0.001, intent="Buy report")

Every ``.pay()`` call runs the full governance pipeline (kill switch,
ERC-8004 identity, policy, anomaly, intent) before settling a USDC
Nanopayment on Arc and writing an on-chain audit receipt. See the
top-level project README for architecture + self-hosting instructions.
"""
from agentguard.core import AgentGuard
from agentguard.exceptions import (
    AgentGuardError,
    APIUnavailable,
    IdentityError,
    PaymentBlocked,
    PolicyViolation,
    WalletPaused,
)
from agentguard.models import (
    Classification,
    Decision,
    Incident,
    PaymentReceipt,
    PaymentRequest,
    PolicyTrace,
)
from agentguard.policy import Policy

__version__ = "0.1.0"

__all__ = [
    "AgentGuard",
    "AgentGuardError",
    "APIUnavailable",
    "Classification",
    "Decision",
    "IdentityError",
    "Incident",
    "PaymentBlocked",
    "PaymentReceipt",
    "PaymentRequest",
    "Policy",
    "PolicyTrace",
    "PolicyViolation",
    "WalletPaused",
    "__version__",
]
