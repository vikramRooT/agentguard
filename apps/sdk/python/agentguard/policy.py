"""Policy definition loader.

The SDK exposes policies as structured dataclasses for optional client-side
pre-checks. The authoritative evaluation happens server-side in
``apps/api/src/services/policy_engine.ts`` — the SDK's copy is for fast
fail-fast behavior (e.g. "amount exceeds per-tx cap, don't even round-trip").
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


@dataclass
class SpendingLimits:
    per_transaction: float = 0.0
    per_day: float = 0.0
    per_recipient_per_day: float = 0.0


@dataclass
class RecipientPolicy:
    type: str = "allowlist"
    approved_recipients: list[str] = field(default_factory=list)
    fallback_action: str = "block"


@dataclass
class ApprovalRule:
    condition: str
    action: str


@dataclass
class KillSwitchConfig:
    enabled: bool = True
    authorized_pausers: list[str] = field(default_factory=list)


@dataclass
class Policy:
    agent_id: str
    owner_wallet: str = ""
    spending_limits: SpendingLimits = field(default_factory=SpendingLimits)
    recipient_policy: RecipientPolicy = field(default_factory=RecipientPolicy)
    category_policy_allowed: list[str] = field(default_factory=list)
    category_policy_blocked: list[str] = field(default_factory=list)
    anomaly_enabled: bool = True
    anomaly_threshold_std_dev: float = 3.0
    intent_verification_enabled: bool = True
    intent_verification_sensitivity: str = "medium"
    approval_rules: list[ApprovalRule] = field(default_factory=list)
    kill_switch: KillSwitchConfig = field(default_factory=KillSwitchConfig)
    audit_log_all_checks: bool = True
    raw: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_yaml(cls, path: str | Path) -> Policy:
        with Path(path).open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Policy:
        spending = data.get("spending_limits", {}) or {}
        recipient = data.get("recipient_policy", {}) or {}
        category = data.get("category_policy", {}) or {}
        anomaly = data.get("anomaly_detection", {}) or {}
        intent = data.get("intent_verification", {}) or {}
        kill_switch = data.get("kill_switch", {}) or {}
        audit = data.get("audit", {}) or {}

        approval_rules = [
            ApprovalRule(condition=r.get("if", ""), action=r.get("then", ""))
            for r in data.get("approval_rules", []) or []
            if isinstance(r, dict)
        ]

        return cls(
            agent_id=data.get("agent_id", ""),
            owner_wallet=data.get("owner_wallet", ""),
            spending_limits=SpendingLimits(
                per_transaction=float(spending.get("per_transaction", 0)),
                per_day=float(spending.get("per_day", 0)),
                per_recipient_per_day=float(spending.get("per_recipient_per_day", 0)),
            ),
            recipient_policy=RecipientPolicy(
                type=recipient.get("type", "allowlist"),
                approved_recipients=list(recipient.get("approved_recipients", []) or []),
                fallback_action=recipient.get("fallback_action", "block"),
            ),
            category_policy_allowed=list(category.get("allowed", []) or []),
            category_policy_blocked=list(category.get("blocked", []) or []),
            anomaly_enabled=bool(anomaly.get("enabled", True)),
            anomaly_threshold_std_dev=float(anomaly.get("alert_threshold_std_dev", 3.0)),
            intent_verification_enabled=bool(intent.get("enabled", True)),
            intent_verification_sensitivity=str(intent.get("sensitivity", "medium")),
            approval_rules=approval_rules,
            kill_switch=KillSwitchConfig(
                enabled=bool(kill_switch.get("enabled", True)),
                authorized_pausers=list(kill_switch.get("authorized_pausers", []) or []),
            ),
            audit_log_all_checks=bool(audit.get("log_all_checks", True)),
            raw=data,
        )

    def quick_check(self, amount_usdc: float, to_agent_id: str | None, to_wallet: str | None) -> tuple[bool, str]:
        """Fail-fast client-side checks. Returns (ok, reason)."""
        if self.spending_limits.per_transaction and amount_usdc > self.spending_limits.per_transaction:
            return False, (
                f"amount {amount_usdc} exceeds per-transaction limit "
                f"{self.spending_limits.per_transaction}"
            )
        if self.recipient_policy.type == "allowlist" and self.recipient_policy.approved_recipients:
            target = to_agent_id or to_wallet
            if target and target not in self.recipient_policy.approved_recipients:
                if self.recipient_policy.fallback_action == "block":
                    return False, f"recipient {target} not on allowlist"
        return True, ""
