"""Tests for the AgentGuard facade."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from pytest_httpx import HTTPXMock

from agentguard import AgentGuard
from agentguard.circle import SettlementResult
from agentguard.exceptions import PaymentBlocked


def _receipt_json(**overrides: Any) -> dict:
    base = {
        "request_id": "req_1",
        "agent_id": "test-agent-v1",
        "decision": "approved",
        "approved": True,
        "amount_usdc": 0.001,
        "to_agent_id": "vendor-agent",
        "reason": "",
        "arc_tx_hash": "0xsettled",
        "audit_tx_hash": "0xaudit",
        "trace": [],
        "latency_ms": 100.0,
    }
    base.update(overrides)
    return base


def test_requires_policy(policy_yaml_path: Path) -> None:
    with pytest.raises(ValueError, match="policy_file"):
        AgentGuard(agent_id="test-agent-v1", api_base_url="http://api.test")


def test_pay_requires_recipient(policy_yaml_path: Path, httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        method="POST", url="http://api.test/v1/agents/test-agent-v1", json={"ok": True}
    )
    with AgentGuard(
        agent_id="test-agent-v1",
        policy_file=policy_yaml_path,
        api_base_url="http://api.test",
    ) as guard:
        with pytest.raises(ValueError, match="to_agent_id"):
            guard.pay(amount_usdc=0.001, intent="x")


def test_pay_happy_path(policy_yaml_path: Path, httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/agents/test-agent-v1",
        json={"ok": True},
    )
    httpx_mock.add_response(
        method="POST", url="http://api.test/v1/pay", json=_receipt_json()
    )
    with AgentGuard(
        agent_id="test-agent-v1",
        policy_file=policy_yaml_path,
        api_base_url="http://api.test",
    ) as guard:
        receipt = guard.pay(
            to_agent_id="vendor-agent", amount_usdc=0.001, intent="buy report"
        )
    assert receipt.approved is True
    assert receipt.arc_tx_hash == "0xsettled"


def test_pay_strict_raises_on_block(
    policy_yaml_path: Path, httpx_mock: HTTPXMock
) -> None:
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/agents/test-agent-v1",
        json={"ok": True},
    )
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/pay",
        json=_receipt_json(
            decision="blocked", approved=False, reason="prompt injection detected"
        ),
    )
    with AgentGuard(
        agent_id="test-agent-v1",
        policy_file=policy_yaml_path,
        api_base_url="http://api.test",
    ) as guard:
        with pytest.raises(PaymentBlocked, match="prompt injection"):
            guard.pay(
                to_agent_id="vendor-agent",
                amount_usdc=0.001,
                intent="x",
                strict=True,
            )


def test_pay_non_strict_returns_blocked_receipt(
    policy_yaml_path: Path, httpx_mock: HTTPXMock
) -> None:
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/agents/test-agent-v1",
        json={"ok": True},
    )
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/pay",
        json=_receipt_json(decision="blocked", approved=False, reason="over limit"),
    )
    with AgentGuard(
        agent_id="test-agent-v1",
        policy_file=policy_yaml_path,
        api_base_url="http://api.test",
    ) as guard:
        receipt = guard.pay(
            to_agent_id="vendor-agent", amount_usdc=0.001, intent="x"
        )
    assert receipt.approved is False
    assert "over limit" in receipt.reason


def test_pay_for_service_mock_settlement(
    policy_yaml_path: Path, httpx_mock: HTTPXMock
) -> None:
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/agents/test-agent-v1",
        json={"ok": True},
    )
    httpx_mock.add_response(
        method="POST", url="http://api.test/v1/pay", json=_receipt_json()
    )
    with AgentGuard(
        agent_id="test-agent-v1",
        policy_file=policy_yaml_path,
        api_base_url="http://api.test",
    ) as guard:
        receipt = guard.pay_for_service(
            url="https://vendor.local/api/analyze", intent="run weekly analysis"
        )
    # Without circlekit installed, settler returns a deterministic mock tx
    assert receipt.approved is True
    settlement = receipt.evidence.get("settlement")
    assert settlement is not None
    assert settlement["mock"] is True
    assert settlement["tx"].startswith("0x")


def test_auto_register_failure_is_non_fatal(
    policy_yaml_path: Path, httpx_mock: HTTPXMock, caplog: pytest.LogCaptureFixture
) -> None:
    # Registration 500s — SDK should log and continue.
    httpx_mock.add_response(
        method="POST",
        url="http://api.test/v1/agents/test-agent-v1",
        status_code=500,
    )
    httpx_mock.add_response(
        method="POST", url="http://api.test/v1/pay", json=_receipt_json()
    )
    with caplog.at_level("WARNING"):
        with AgentGuard(
            agent_id="test-agent-v1",
            policy_file=policy_yaml_path,
            api_base_url="http://api.test",
        ) as guard:
            receipt = guard.pay(
                to_agent_id="vendor-agent", amount_usdc=0.001, intent="x"
            )
    assert receipt.approved is True
    assert any("auto-register failed" in r.message for r in caplog.records)


def test_settlement_result_dataclass() -> None:
    # Quick sanity on the public dataclass used in .evidence["settlement"].
    s = SettlementResult(
        transaction="0xabc",
        amount_usdc=0.001,
        payer="0xPayer",
        chain="arcTestnet",
        mock=False,
    )
    assert s.transaction == "0xabc"
    assert s.mock is False
