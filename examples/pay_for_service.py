"""Pay an x402-protected endpoint through AgentGuard + Circle Gateway.

Full real flow: agent sends request through the AgentGuard governance
pipeline (policy, identity, anomaly, intent). If approved, the Python SDK
calls Circle Gateway via `circlekit.GatewayClientSync.pay(url)` using the
agent's Circle Developer-Controlled Wallet. Gateway batches settlement
on Arc Testnet.

Prereqs:
    1. pnpm seed                              # agents registered with AgentGuard
    2. AgentGuard API running on :4000
    3. Arc-funded Circle Wallet with a Gateway balance
       (run examples/deposit_to_gateway.py first)

Usage (Circle Wallet path, no private key on disk — recommended):
    AGENT=research python examples/pay_for_service.py

Usage (private-key path, if you prefer):
    ARC_AGENT_PRIVATE_KEY=0x... python examples/pay_for_service.py
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

from agentguard import AgentGuard

AGENT_ENV_MAP = {
    "research": ("DEMO_RESEARCH_AGENT_WALLET_ID", "DEMO_RESEARCH_AGENT_WALLET_ADDRESS"),
    "data_vendor": ("DEMO_DATA_VENDOR_AGENT_WALLET_ID", "DEMO_DATA_VENDOR_AGENT_WALLET_ADDRESS"),
    "sms": ("DEMO_SMS_AGENT_WALLET_ID", "DEMO_SMS_AGENT_WALLET_ADDRESS"),
    "inference": ("DEMO_INFERENCE_AGENT_WALLET_ID", "DEMO_INFERENCE_AGENT_WALLET_ADDRESS"),
    "compromised": ("DEMO_COMPROMISED_AGENT_WALLET_ID", "DEMO_COMPROMISED_AGENT_WALLET_ADDRESS"),
    "treasury": ("AGENTGUARD_TREASURY_WALLET_ID", "AGENTGUARD_TREASURY_WALLET_ADDRESS"),
}

AGENT_ID_MAP = {
    "research": "research-agent-v1",
    "data_vendor": "data-vendor-agent-v1",
    "sms": "sms-agent-v1",
    "inference": "inference-agent-v1",
    "compromised": "compromised-agent-v1",
    "treasury": "agentguard-treasury",
}


def main() -> None:
    agent = os.environ.get("AGENT", "research")
    if agent not in AGENT_ENV_MAP:
        print(f"error: AGENT must be one of {list(AGENT_ENV_MAP)}")
        sys.exit(1)

    url = os.environ.get(
        "AGENTGUARD_TARGET_URL",
        "https://api.aisa.one/apis/v2/twitter/user/info?userName=jack",
    )
    intent = os.environ.get(
        "AGENTGUARD_INTENT", "Fetch social-signal data for this week's brief"
    )
    task_id = os.environ.get("AGENTGUARD_TASK_ID", "brief-2026-w17")
    expected_max_usdc = float(os.environ.get("AGENTGUARD_EXPECTED_MAX_USDC", "0.01"))

    wallet_id_var, addr_var = AGENT_ENV_MAP[agent]
    wallet_id = os.environ.get(wallet_id_var)
    wallet_address = os.environ.get(addr_var)
    private_key = os.environ.get("ARC_AGENT_PRIVATE_KEY")

    # Pick the settler path. Circle Wallet beats a raw private key whenever
    # both are available — fewer secrets on disk.
    sdk_kwargs: dict[str, object] = {}
    if wallet_id and wallet_address:
        print(f"settler:  Circle Wallet ({wallet_address})")
        sdk_kwargs["circle_wallet_id"] = wallet_id
        sdk_kwargs["circle_wallet_address"] = wallet_address
    elif private_key:
        print("settler:  private key (ARC_AGENT_PRIVATE_KEY)")
        sdk_kwargs["private_key"] = private_key
    else:
        print("settler:  mock (no Circle Wallet or private key configured)")

    with AgentGuard(
        agent_id=AGENT_ID_MAP[agent],
        policy_file="policies/research-agent-v1.yaml",
        api_base_url="http://localhost:4000",
        **sdk_kwargs,
    ) as guard:
        if sdk_kwargs.get("circle_wallet_id") or sdk_kwargs.get("private_key"):
            bal = guard.balances()
            if bal:
                print(f"balances: {bal}")

        print(f"target:   {url}")
        print(f"intent:   {intent}")
        print()

        receipt = guard.pay_for_service(
            url=url,
            intent=intent,
            expected_max_usdc=expected_max_usdc,
            original_task_id=task_id,
        )

        if receipt.approved:
            print("[OK] governance approved, settlement completed")
            print(f"     arc tx:   {receipt.arc_tx_hash}")
            print(f"     audit tx: {receipt.audit_tx_hash}")
            print(f"     latency:  {receipt.latency_ms:.0f} ms")
        else:
            print(f"[BLOCK] {receipt.reason}")
            for step in receipt.trace:
                flag = "pass" if step.passed else "fail"
                print(f"    {step.layer:<12} {flag} -- {step.reason}")


if __name__ == "__main__":
    main()
