"""Pydantic models shared between the SDK and the API."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Decision(str, Enum):
    APPROVED = "approved"
    BLOCKED = "blocked"
    ESCALATED = "escalated"


class Classification(str, Enum):
    ALIGNED = "aligned"
    SUSPICIOUS = "suspicious"
    MALICIOUS = "malicious"


class PaymentRequest(BaseModel):
    """Payload sent from SDK to API for a governed payment."""

    model_config = ConfigDict(extra="forbid")

    agent_id: str
    to_agent_id: str | None = None
    to_wallet_address: str | None = None
    amount_usdc: float = Field(gt=0)
    asset: Literal["USDC"] = "USDC"
    intent: str = Field(min_length=1, max_length=2048)
    original_task_id: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class PolicyTrace(BaseModel):
    """Result of a single policy layer evaluation."""

    layer: Literal["policy", "anomaly", "intent", "identity", "kill_switch"]
    passed: bool
    reason: str
    detail: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float = 0.0


class Incident(BaseModel):
    """Record of a blocked or escalated payment attempt."""

    incident_id: str
    agent_id: str
    created_at: datetime
    decision: Decision
    reason: str
    trace: list[PolicyTrace]
    evidence: dict[str, Any] = Field(default_factory=dict)
    arc_audit_tx_hash: str | None = None


class PaymentReceipt(BaseModel):
    """Result of a governed ``agentguard.pay`` call."""

    request_id: str
    agent_id: str
    decision: Decision
    approved: bool
    amount_usdc: float
    to_agent_id: str | None = None
    to_wallet_address: str | None = None
    reason: str = ""
    trace: list[PolicyTrace] = Field(default_factory=list)
    arc_tx_hash: str | None = None
    """Hash of the settlement nanopayment if approved."""
    audit_tx_hash: str | None = None
    """Hash of the audit-log nanopayment (fired regardless of decision)."""
    evidence: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
