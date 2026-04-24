"""Exceptions raised by the AgentGuard SDK."""
from __future__ import annotations


class AgentGuardError(Exception):
    """Base class for all AgentGuard SDK errors."""


class PaymentBlocked(AgentGuardError):
    """Raised when a payment is blocked by policy, anomaly, or intent checks.

    Use ``AgentGuard.pay()`` instead of catching this — the method returns a
    ``PaymentReceipt`` with ``approved=False`` by default. This exception is
    raised only when callers opt into strict mode via ``pay(..., strict=True)``.
    """


class PolicyViolation(PaymentBlocked):
    """The request violates the agent's configured policy."""


class IdentityError(AgentGuardError):
    """The sending or receiving agent failed ERC-8004 identity verification."""


class APIUnavailable(AgentGuardError):
    """The AgentGuard API could not be reached."""


class WalletPaused(PaymentBlocked):
    """The agent's wallet has been paused by the operator kill switch."""
