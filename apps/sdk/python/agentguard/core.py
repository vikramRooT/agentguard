"""The ``AgentGuard`` facade — the three-line integration surface for agents."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from agentguard.circle import CircleGatewaySettler, SettlementResult
from agentguard.client import APIClient
from agentguard.exceptions import PaymentBlocked
from agentguard.models import Decision, PaymentReceipt, PaymentRequest
from agentguard.policy import Policy

_log = logging.getLogger(__name__)


class AgentGuard:
    """Governed-payment SDK for autonomous agents.

    Supports two payment modes:

    1. **Raw A2A transfer** (``pay(to_agent_id=..., amount_usdc=...)``) — sends
       the transaction through the AgentGuard pipeline. When real Circle
       credentials are configured on the server side, settlement runs through
       the real Gateway API; otherwise it uses the mock path so dashboards
       still light up.
    2. **x402 resource purchase** (``pay_for_service(url=...)``) — runs the
       governance pipeline, then (if approved + ``circlekit`` is installed)
       actually pays the x402-protected endpoint via
       :class:`CircleGatewaySettler`. This is the "real" Circle Nanopayments
       path: EIP-712 sig + Gateway batching.

    Example
    -------
    >>> guard = AgentGuard(
    ...     agent_id="research-agent-v1",
    ...     policy_file="policies/research.yaml",
    ...     api_base_url="http://localhost:4000",
    ...     private_key="0x...",  # optional — enables real x402 settlement
    ... )
    >>> receipt = guard.pay(
    ...     to_agent_id="data-vendor-agent-v1",
    ...     amount_usdc=0.001,
    ...     intent="Buy Q3 macro stats report",
    ... )
    >>> receipt = guard.pay_for_service(
    ...     url="https://vendor-agent.local/api/analyze",
    ...     intent="Run analysis for weekly brief",
    ... )
    """

    def __init__(
        self,
        *,
        agent_id: str,
        policy_file: str | Path | None = None,
        policy: Policy | None = None,
        api_base_url: str = "http://localhost:4000",
        api_key: str | None = None,
        auto_register: bool = True,
        private_key: str | None = None,
        circle_wallet_id: str | None = None,
        circle_wallet_address: str | None = None,
        chain: str = "arcTestnet",
    ) -> None:
        if policy_file is None and policy is None:
            raise ValueError("provide either policy_file= or policy=")
        self.agent_id = agent_id
        self.policy = policy or Policy.from_yaml(policy_file)  # type: ignore[arg-type]
        if not self.policy.agent_id:
            self.policy.agent_id = agent_id
        self._client = APIClient(api_base_url, api_key=api_key)
        self._settler = self._build_settler(
            private_key=private_key,
            circle_wallet_id=circle_wallet_id,
            circle_wallet_address=circle_wallet_address,
            chain=chain,
        )

        if auto_register:
            try:
                self._client.register_agent(agent_id, {"policy": self.policy.raw})
            except Exception as exc:  # pragma: no cover - best-effort
                _log.warning("agent auto-register failed (continuing): %s", exc)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def pay(
        self,
        *,
        to_agent_id: str | None = None,
        to_wallet_address: str | None = None,
        amount_usdc: float,
        intent: str,
        original_task_id: str | None = None,
        context: dict[str, Any] | None = None,
        strict: bool = False,
    ) -> PaymentReceipt:
        """Execute a governed payment (A2A / raw transfer).

        Returns a :class:`PaymentReceipt` describing the outcome. If ``strict``
        is True, raises :class:`PaymentBlocked` on non-approval instead.
        """
        if not (to_agent_id or to_wallet_address):
            raise ValueError("provide either to_agent_id= or to_wallet_address=")

        ok, reason = self.policy.quick_check(amount_usdc, to_agent_id, to_wallet_address)
        if not ok:
            _log.info("agentguard: local policy block for %s — %s", self.agent_id, reason)

        request = PaymentRequest(
            agent_id=self.agent_id,
            to_agent_id=to_agent_id,
            to_wallet_address=to_wallet_address,
            amount_usdc=amount_usdc,
            intent=intent,
            original_task_id=original_task_id,
            context=context or {},
        )
        receipt = self._client.verify_and_pay(request)

        if strict and receipt.decision != Decision.APPROVED:
            raise PaymentBlocked(receipt.reason or "payment blocked")
        return receipt

    def pay_for_service(
        self,
        *,
        url: str,
        intent: str,
        expected_max_usdc: float = 10.0,
        original_task_id: str | None = None,
        context: dict[str, Any] | None = None,
        strict: bool = False,
    ) -> PaymentReceipt:
        """Pay an x402-protected endpoint through the governance pipeline.

        Flow:
            1. Submit ``{url, expected_max_usdc, intent, ...}`` to the
               AgentGuard API for verification.
            2. If approved, call ``CircleGatewaySettler.pay(url)`` to actually
               do the Circle Gateway + x402 settlement (or mock fallback).
            3. Return a merged :class:`PaymentReceipt` that includes the
               governance decision + the real Arc tx hash.

        Raises :class:`PaymentBlocked` if ``strict`` is True and the decision
        wasn't ``approved``.
        """
        payload_context = dict(context or {})
        payload_context.setdefault("settlement_mode", "x402_gateway")
        payload_context.setdefault("target_url", url)

        request = PaymentRequest(
            agent_id=self.agent_id,
            to_wallet_address=None,
            to_agent_id=None,
            amount_usdc=expected_max_usdc,
            intent=intent,
            original_task_id=original_task_id,
            context={**payload_context, "url": url},
        )
        # Server runs the full pipeline; at this stage it returns a decision
        # but hasn't settled anything (we'll do that next).
        receipt = self._client.verify_and_pay(request)

        if receipt.decision == Decision.APPROVED:
            settlement = self._settler.pay(url)
            receipt = _merge_settlement_into_receipt(receipt, settlement)

        if strict and receipt.decision != Decision.APPROVED:
            raise PaymentBlocked(receipt.reason or "payment blocked")
        return receipt

    def escalate(self, receipt: PaymentReceipt) -> None:
        """Escalate a blocked receipt to human review via the API."""
        self._client.register_agent(
            self.agent_id,
            {"escalate_request_id": receipt.request_id},
        )

    def balances(self) -> dict[str, Any] | None:
        """Return wallet + Gateway balances if a settler is configured."""
        return self._settler.get_balances()

    def close(self) -> None:
        self._client.close()
        self._settler.close()

    def __enter__(self) -> "AgentGuard":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _build_settler(
        self,
        *,
        private_key: str | None,
        circle_wallet_id: str | None,
        circle_wallet_address: str | None,
        chain: str,
    ) -> CircleGatewaySettler:
        if circle_wallet_id and circle_wallet_address:
            return CircleGatewaySettler.from_circle_wallet(
                wallet_id=circle_wallet_id,
                wallet_address=circle_wallet_address,
                chain=chain,
            )
        if private_key:
            return CircleGatewaySettler.from_private_key(
                private_key=private_key, chain=chain
            )
        return CircleGatewaySettler(client=None)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _merge_settlement_into_receipt(
    receipt: PaymentReceipt, settlement: SettlementResult
) -> PaymentReceipt:
    """Stamp real Circle Gateway settlement details onto the governance receipt."""
    receipt.arc_tx_hash = settlement.transaction or receipt.arc_tx_hash
    if settlement.amount_usdc and not receipt.amount_usdc:
        receipt.amount_usdc = settlement.amount_usdc
    receipt.evidence = {
        **(receipt.evidence or {}),
        "settlement": {
            "tx": settlement.transaction,
            "chain": settlement.chain,
            "payer": settlement.payer,
            "amount_usdc": settlement.amount_usdc,
            "mock": settlement.mock,
            "raw": settlement.raw,
        },
    }
    return receipt
