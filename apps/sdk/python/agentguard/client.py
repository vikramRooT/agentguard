"""HTTP client for the AgentGuard API."""
from __future__ import annotations

from typing import Any

import httpx

from agentguard.exceptions import APIUnavailable
from agentguard.models import PaymentReceipt, PaymentRequest


class APIClient:
    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        timeout_s: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        headers: dict[str, str] = {}
        if api_key:
            headers["authorization"] = f"Bearer {api_key}"
        self._http = httpx.Client(base_url=self.base_url, headers=headers, timeout=timeout_s)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> APIClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def verify_and_pay(self, request: PaymentRequest) -> PaymentReceipt:
        try:
            # exclude_none so pydantic doesn't serialize optional fields as
            # `null`, which zod treats as a type violation.
            response = self._http.post(
                "/v1/pay",
                json=request.model_dump(exclude_none=True),
            )
        except httpx.HTTPError as exc:
            raise APIUnavailable(f"AgentGuard API unreachable: {exc}") from exc

        if response.status_code >= 500:
            raise APIUnavailable(
                f"AgentGuard API error {response.status_code}: {response.text}"
            )
        if response.status_code >= 400:
            raise APIUnavailable(
                f"AgentGuard API rejected the request {response.status_code}: "
                f"{response.text}"
            )
        return PaymentReceipt.model_validate(response.json())

    def register_agent(self, agent_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            response = self._http.post(f"/v1/agents/{agent_id}", json=payload)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise APIUnavailable(f"AgentGuard API unreachable: {exc}") from exc
        return response.json()

    def upload_policy(self, agent_id: str, policy_raw: dict[str, Any]) -> dict[str, Any]:
        try:
            response = self._http.put(
                f"/v1/agents/{agent_id}/policy",
                json={"policy": policy_raw},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise APIUnavailable(f"AgentGuard API unreachable: {exc}") from exc
        return response.json()
