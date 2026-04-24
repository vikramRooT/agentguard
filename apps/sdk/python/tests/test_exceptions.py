"""Tests for the exception hierarchy."""
from __future__ import annotations

from agentguard.exceptions import (
    AgentGuardError,
    APIUnavailable,
    IdentityError,
    PaymentBlocked,
    PolicyViolation,
    WalletPaused,
)


def test_hierarchy() -> None:
    # PaymentBlocked is the catch-all for all governance-layer refusals.
    assert issubclass(PaymentBlocked, AgentGuardError)
    assert issubclass(PolicyViolation, PaymentBlocked)
    assert issubclass(WalletPaused, PaymentBlocked)
    # Identity + transport failures are separate branches.
    assert issubclass(IdentityError, AgentGuardError)
    assert not issubclass(IdentityError, PaymentBlocked)
    assert issubclass(APIUnavailable, AgentGuardError)
    assert not issubclass(APIUnavailable, PaymentBlocked)


def test_payment_blocked_carries_message() -> None:
    try:
        raise PaymentBlocked("amount exceeds per-tx limit")
    except PaymentBlocked as e:
        assert "exceeds per-tx limit" in str(e)
