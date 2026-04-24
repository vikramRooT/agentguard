"""Tests for the pydantic models on the SDK/API boundary."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from agentguard.models import (
    Classification,
    Decision,
    Incident,
    PaymentReceipt,
    PaymentRequest,
    PolicyTrace,
)


def test_payment_request_serializes_without_nulls() -> None:
    req = PaymentRequest(
        agent_id="a",
        to_agent_id="b",
        amount_usdc=0.001,
        intent="buy thing",
    )
    payload = req.model_dump(exclude_none=True)
    assert payload == {
        "agent_id": "a",
        "to_agent_id": "b",
        "amount_usdc": 0.001,
        "asset": "USDC",
        "intent": "buy thing",
        "context": {},
    }


def test_payment_request_rejects_zero_amount() -> None:
    with pytest.raises(ValidationError):
        PaymentRequest(agent_id="a", to_agent_id="b", amount_usdc=0, intent="x")


def test_payment_request_rejects_negative_amount() -> None:
    with pytest.raises(ValidationError):
        PaymentRequest(
            agent_id="a", to_agent_id="b", amount_usdc=-0.0001, intent="x"
        )


def test_payment_request_rejects_empty_intent() -> None:
    with pytest.raises(ValidationError):
        PaymentRequest(agent_id="a", to_agent_id="b", amount_usdc=1, intent="")


def test_payment_request_rejects_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        PaymentRequest.model_validate(
            {
                "agent_id": "a",
                "to_agent_id": "b",
                "amount_usdc": 0.001,
                "intent": "buy",
                "unexpected_field": True,
            }
        )


def test_payment_receipt_roundtrip() -> None:
    raw = {
        "request_id": "req_123",
        "agent_id": "agent-x",
        "decision": "approved",
        "approved": True,
        "amount_usdc": 0.001,
        "to_agent_id": "vendor",
        "reason": "",
        "arc_tx_hash": "0xabc",
        "audit_tx_hash": "0xdef",
        "latency_ms": 187.4,
        "trace": [
            {
                "layer": "policy",
                "passed": True,
                "reason": "ok",
                "detail": {},
                "latency_ms": 2.1,
            }
        ],
    }
    receipt = PaymentReceipt.model_validate(raw)
    assert receipt.decision is Decision.APPROVED
    assert receipt.approved is True
    assert receipt.trace[0].layer == "policy"
    assert receipt.trace[0].passed is True


def test_policy_trace_rejects_unknown_layer() -> None:
    with pytest.raises(ValidationError):
        PolicyTrace(layer="voodoo", passed=True, reason="ok")  # type: ignore[arg-type]


def test_incident_parses() -> None:
    inc = Incident(
        incident_id="inc_1",
        agent_id="a",
        created_at=datetime(2026, 4, 24, tzinfo=timezone.utc),
        decision=Decision.BLOCKED,
        reason="prompt injection detected",
        trace=[
            PolicyTrace(layer="intent", passed=False, reason="malicious intent")
        ],
        evidence={"score": 0.94},
    )
    assert inc.decision is Decision.BLOCKED
    assert inc.trace[0].layer == "intent"


def test_classification_enum_values() -> None:
    assert Classification.ALIGNED.value == "aligned"
    assert Classification.SUSPICIOUS.value == "suspicious"
    assert Classification.MALICIOUS.value == "malicious"
