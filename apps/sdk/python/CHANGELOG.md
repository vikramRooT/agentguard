# Changelog

All notable changes to `agentguard-protocol` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-04-24

First public release. The SDK is the client surface for the AgentGuard
governance protocol — every payment an AI agent makes passes through five
layers (kill switch, ERC-8004 identity, policy, anomaly, intent) before
settling as a USDC Nanopayment on Arc with an on-chain audit receipt.

### Added

- `AgentGuard` facade with `.pay()` (raw A2A transfer) and `.pay_for_service()`
  (x402-protected endpoint via Circle Gateway).
- `Policy` loader with YAML and dict constructors; supports spending limits,
  allowlists, intent-verification sensitivity, approval rules, and kill switch
  config.
- `PaymentRequest` / `PaymentReceipt` / `PolicyTrace` / `Incident` pydantic
  models shared between the SDK and the API.
- Exceptions: `AgentGuardError`, `PaymentBlocked`, `PolicyViolation`,
  `IdentityError`, `WalletPaused`, `APIUnavailable`.
- Optional `[circle]` extra — pulls in `circle-titanoboa-sdk` to enable real
  Circle Gateway + x402 settlement via `CircleGatewaySettler`. Gracefully
  falls back to a deterministic mock when the extra isn't installed, so
  dashboards still work.
- Strict mode on `.pay(..., strict=True)` — raises `PaymentBlocked` on
  non-approval instead of returning a receipt with `approved=False`.
- Unit tests covering the policy loader, pydantic models, and the HTTP client
  (mocked with `pytest-httpx`).
- Example scripts: `legitimate_payment.py`, `pay_for_service.py`,
  `claude_agent_sdk_integration.py`.
