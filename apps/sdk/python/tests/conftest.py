"""Shared fixtures for agentguard tests."""
from __future__ import annotations

from pathlib import Path

import pytest

from agentguard.policy import Policy


SAMPLE_POLICY_YAML = """
agent_id: test-agent-v1
owner_wallet: 0xOwner

spending_limits:
  per_transaction: 5
  per_day: 50
  per_recipient_per_day: 10

recipient_policy:
  type: allowlist
  approved_recipients:
    - vendor-agent
    - inference-agent
  fallback_action: block

category_policy:
  allowed: [data_purchase, compute]
  blocked: [gambling]

intent_verification:
  enabled: true
  sensitivity: medium

anomaly_detection:
  enabled: true
  alert_threshold_std_dev: 3.0

approval_rules:
  - if: transaction_amount > 2
    then: require_human_approval

kill_switch:
  enabled: true
  authorized_pausers:
    - 0xOperator

audit:
  log_all_checks: true
"""


@pytest.fixture
def policy_yaml_path(tmp_path: Path) -> Path:
    """A sample policy YAML file written to a temp dir."""
    p = tmp_path / "policy.yaml"
    p.write_text(SAMPLE_POLICY_YAML, encoding="utf-8")
    return p


@pytest.fixture
def policy(policy_yaml_path: Path) -> Policy:
    return Policy.from_yaml(policy_yaml_path)
