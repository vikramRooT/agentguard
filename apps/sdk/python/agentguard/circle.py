"""Optional Circle Gateway + x402 settlement layer.

AgentGuard runs a governance pipeline regardless of whether payments actually
settle on-chain. This module plugs real Circle Nanopayments (Gateway-batched
x402 settlement) into the pipeline for agents that want real on-chain proof.

Requirements: install the extra::

    pip install "agentguard[circle]"

which pulls in `circle-titanoboa-sdk` (exposes the `circlekit` module).
The SDK gracefully falls back to mock settlement when `circlekit` isn't
available — callers get a valid-looking :class:`PaymentReceipt` with
``mock=True`` in the evidence so dashboards can distinguish it.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

_log = logging.getLogger(__name__)


@dataclass
class SettlementResult:
    """Normalized result from either a real or mock settlement."""

    transaction: str
    amount_usdc: float
    payer: str | None
    chain: str
    mock: bool
    raw: dict[str, Any] | None = None


class CircleGatewaySettler:
    """Thin wrapper around circlekit.GatewayClientSync.

    The SDK holds at most one instance of this per process. Instantiation is
    cheap; calling ``pay()`` is what actually does on-chain work.

    Example
    -------
    >>> settler = CircleGatewaySettler.from_private_key("0x...", chain="arcTestnet")
    >>> if settler.ready():
    ...     result = settler.pay("https://vendor-agent.local/api/analyze")
    """

    def __init__(self, client: Any | None) -> None:
        # `client` is typed Any because `circlekit` is an optional import.
        self._client = client

    @classmethod
    def from_private_key(
        cls, private_key: str, *, chain: str = "arcTestnet", rpc_url: str | None = None
    ) -> "CircleGatewaySettler":
        client = _try_build_sync_client(private_key=private_key, chain=chain, rpc_url=rpc_url)
        return cls(client)

    @classmethod
    def from_circle_wallet(
        cls,
        *,
        wallet_id: str,
        wallet_address: str,
        chain: str = "arcTestnet",
    ) -> "CircleGatewaySettler":
        """Use a Circle Developer-Controlled Wallet via CircleWalletSigner.

        Reads CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET from env (circlekit handles
        this internally). Keep the private key out of our process entirely.
        """
        client = _try_build_circle_wallet_client(
            wallet_id=wallet_id, wallet_address=wallet_address, chain=chain
        )
        return cls(client)

    def ready(self) -> bool:
        return self._client is not None

    def pay(self, url: str) -> SettlementResult:
        """Pay for an x402-protected resource.

        Returns a :class:`SettlementResult` either way — with ``mock=True``
        when circlekit is unavailable, so AgentGuard's demo path keeps
        working without credentials.
        """
        if self._client is None:
            return _mock_settlement(url, chain="arcTestnet")
        try:
            result = self._client.pay(url)
        except Exception as exc:
            _log.warning("circlekit pay failed (%s); using mock fallback", exc)
            return _mock_settlement(url, chain="arcTestnet")
        return _normalize_circlekit_result(result)

    def get_balances(self) -> dict[str, Any] | None:
        if self._client is None:
            return None
        try:
            balances = self._client.get_balances()
        except Exception as exc:
            _log.warning("circlekit get_balances failed: %s", exc)
            return None
        return {
            "wallet_usdc": str(getattr(balances.wallet, "formatted", "0")),
            "gateway_available": str(
                getattr(balances.gateway, "formatted_available", "0")
            ),
        }

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _try_build_sync_client(
    *, private_key: str, chain: str, rpc_url: str | None
) -> Any | None:
    try:
        from circlekit import GatewayClientSync  # type: ignore[import-not-found]
    except ImportError:
        _log.info("circlekit not installed; install 'agentguard[circle]' for real settlement")
        return None
    try:
        kwargs: dict[str, Any] = {"chain": chain, "private_key": private_key}
        if rpc_url:
            kwargs["rpc_url"] = rpc_url
        return GatewayClientSync(**kwargs)
    except Exception as exc:
        _log.warning("failed to construct GatewayClientSync: %s", exc)
        return None


def _try_build_circle_wallet_client(
    *, wallet_id: str, wallet_address: str, chain: str
) -> Any | None:
    try:
        from circlekit import GatewayClientSync  # type: ignore[import-not-found]
        from circlekit.wallets import (  # type: ignore[import-not-found]
            CircleWalletSigner,
            CircleTxExecutor,
        )
    except ImportError:
        _log.info(
            "circlekit[wallets] not installed; install 'agentguard[circle]' and "
            "'circle-titanoboa-sdk[wallets]' for Circle Wallets-backed settlement"
        )
        return None
    try:
        signer = CircleWalletSigner(wallet_id=wallet_id, wallet_address=wallet_address)
        tx_executor = CircleTxExecutor(wallet_id=wallet_id, wallet_address=wallet_address)
        return GatewayClientSync(chain=chain, signer=signer, tx_executor=tx_executor)
    except Exception as exc:
        _log.warning("failed to construct Circle-Wallet-backed client: %s", exc)
        return None


def _normalize_circlekit_result(result: Any) -> SettlementResult:
    return SettlementResult(
        transaction=getattr(result, "transaction", ""),
        amount_usdc=float(getattr(result, "formatted_amount", 0) or 0),
        payer=getattr(result, "payer", None),
        chain=str(getattr(result, "chain", "arcTestnet")),
        mock=False,
        raw=getattr(result, "data", None),
    )


def _mock_settlement(url: str, chain: str) -> SettlementResult:
    """Deterministic mock so the demo path is reproducible."""
    import hashlib

    tx = "0x" + hashlib.sha256(url.encode()).hexdigest()
    return SettlementResult(
        transaction=tx,
        amount_usdc=0.0,
        payer=None,
        chain=chain,
        mock=True,
        raw=None,
    )
