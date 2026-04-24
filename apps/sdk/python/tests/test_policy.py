"""Tests for the Policy loader + client-side quick-check."""
from __future__ import annotations

from pathlib import Path

import pytest

from agentguard.policy import Policy


def test_policy_from_yaml_parses_all_sections(policy: Policy) -> None:
    assert policy.agent_id == "test-agent-v1"
    assert policy.owner_wallet == "0xOwner"

    assert policy.spending_limits.per_transaction == 5
    assert policy.spending_limits.per_day == 50
    assert policy.spending_limits.per_recipient_per_day == 10

    assert policy.recipient_policy.type == "allowlist"
    assert "vendor-agent" in policy.recipient_policy.approved_recipients
    assert policy.recipient_policy.fallback_action == "block"

    assert policy.category_policy_allowed == ["data_purchase", "compute"]
    assert policy.category_policy_blocked == ["gambling"]

    assert policy.intent_verification_enabled is True
    assert policy.intent_verification_sensitivity == "medium"

    assert policy.anomaly_enabled is True
    assert policy.anomaly_threshold_std_dev == 3.0

    assert policy.approval_rules[0].condition == "transaction_amount > 2"
    assert policy.approval_rules[0].action == "require_human_approval"

    assert policy.kill_switch.enabled is True
    assert "0xOperator" in policy.kill_switch.authorized_pausers

    assert policy.audit_log_all_checks is True
    # Raw YAML should be stashed so the API sees the same structure.
    assert "spending_limits" in policy.raw


def test_policy_from_dict_with_empty_sections() -> None:
    p = Policy.from_dict({"agent_id": "x"})
    assert p.agent_id == "x"
    assert p.spending_limits.per_transaction == 0
    assert p.recipient_policy.approved_recipients == []
    assert p.kill_switch.enabled is True  # default


def test_quick_check_blocks_over_per_transaction_limit(policy: Policy) -> None:
    ok, reason = policy.quick_check(10, to_agent_id="vendor-agent", to_wallet=None)
    assert ok is False
    assert "exceeds per-transaction limit" in reason


def test_quick_check_allows_within_limit_and_on_allowlist(policy: Policy) -> None:
    ok, reason = policy.quick_check(0.5, to_agent_id="vendor-agent", to_wallet=None)
    assert ok is True
    assert reason == ""


def test_quick_check_blocks_unknown_recipient(policy: Policy) -> None:
    ok, reason = policy.quick_check(
        0.5, to_agent_id="unknown-agent", to_wallet=None
    )
    assert ok is False
    assert "not on allowlist" in reason


def test_quick_check_wallet_address_fallback(policy: Policy) -> None:
    # Wallet matches allowlist by address
    ok, _ = policy.quick_check(0.5, to_agent_id=None, to_wallet="vendor-agent")
    assert ok is True


def test_from_yaml_missing_file_raises(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        Policy.from_yaml(tmp_path / "nope.yaml")


def test_from_dict_empty_input_has_sane_defaults() -> None:
    p = Policy.from_dict({})
    assert p.agent_id == ""
    assert p.recipient_policy.type == "allowlist"
    assert p.anomaly_enabled is True
