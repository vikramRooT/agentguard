"""Tests for APIClient — HTTP layer mocked with pytest-httpx."""
from __future__ import annotations

import httpx
import pytest
from pytest_httpx import HTTPXMock

from agentguard.client import APIClient
from agentguard.exceptions import APIUnavailable
from agentguard.models import Decision, PaymentRequest


def _make_client(base: str = "http://api.test") -> APIClient:
    return APIClient(base)


def _receipt_json(decision: str = "approved", approved: bool = True) -> dict:
    return {
        "request_id": "req_1",
        "agent_id": "a",
        "decision": decision,
        "approved": approved,
        "amount_usdc": 0.001,
        "to_agent_id": "vendor",
        "reason": "",
        "arc_tx_hash": "0xabc",
        "audit_tx_hash": "0xdef",
        "trace": [],
        "latency_ms": 120.0,
    }


def test_verify_and_pay_approved(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/pay",
        json=_receipt_json(),
    )
    with _make_client() as c:
        req = PaymentRequest(
            agent_id="a", to_agent_id="vendor", amount_usdc=0.001, intent="x"
        )
        receipt = c.verify_and_pay(req)
    assert receipt.decision is Decision.APPROVED
    assert receipt.arc_tx_hash == "0xabc"


def test_verify_and_pay_excludes_none_fields(httpx_mock: HTTPXMock) -> None:
    """The client MUST send exclude_none=True or zod rejects null fields."""
    httpx_mock.add_response(json=_receipt_json())

    with _make_client() as c:
        req = PaymentRequest(
            agent_id="a",
            to_agent_id="vendor",
            amount_usdc=0.001,
            intent="x",
            # to_wallet_address & original_task_id intentionally omitted
        )
        c.verify_and_pay(req)

    sent_request = httpx_mock.get_request()
    assert sent_request is not None
    body = sent_request.read()
    assert b"to_wallet_address" not in body
    assert b"original_task_id" not in body


def test_verify_and_pay_500_raises_api_unavailable(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(status_code=503, text="upstream broken")
    with _make_client() as c:
        req = PaymentRequest(
            agent_id="a", to_agent_id="vendor", amount_usdc=0.001, intent="x"
        )
        with pytest.raises(APIUnavailable, match="API error 503"):
            c.verify_and_pay(req)


def test_verify_and_pay_400_raises_api_unavailable(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(status_code=400, text="bad request")
    with _make_client() as c:
        req = PaymentRequest(
            agent_id="a", to_agent_id="vendor", amount_usdc=0.001, intent="x"
        )
        with pytest.raises(APIUnavailable, match="rejected"):
            c.verify_and_pay(req)


def test_verify_and_pay_connection_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_exception(httpx.ConnectError("connection refused"))
    with _make_client() as c:
        req = PaymentRequest(
            agent_id="a", to_agent_id="vendor", amount_usdc=0.001, intent="x"
        )
        with pytest.raises(APIUnavailable, match="unreachable"):
            c.verify_and_pay(req)


def test_register_agent(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/agents/agent-1",
        json={"ok": True, "agent_id": "agent-1"},
    )
    with _make_client() as c:
        out = c.register_agent("agent-1", {"policy": {}})
    assert out == {"ok": True, "agent_id": "agent-1"}


def test_register_agent_error(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(status_code=500, text="db down")
    with _make_client() as c:
        with pytest.raises(APIUnavailable):
            c.register_agent("agent-1", {})


def test_auth_header_set() -> None:
    """API keys should be attached as a Bearer token on every request."""
    c = APIClient("http://api.test", api_key="sk_test_abc")
    assert c._http.headers["authorization"] == "Bearer sk_test_abc"
    c.close()
