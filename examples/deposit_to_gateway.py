"""Deposit USDC from a Circle Wallet into Circle Gateway.

Gateway uses a unified USDC balance for payments. Before an agent can call
`gateway.pay(url)`, its Gateway balance must be non-zero. This script deposits
from the agent's wallet-level USDC into Gateway.

Requires: faucet-funded Circle Wallet, CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET
in .env, and circlekit[wallets] installed.

Usage:
    AGENT=research python examples/deposit_to_gateway.py
    (valid AGENT values: research, data_vendor, sms, inference, compromised, treasury)
    AMOUNT_USDC=1.0 python examples/deposit_to_gateway.py  # amount override
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

AGENT_ENV_MAP = {
    "research": ("DEMO_RESEARCH_AGENT_WALLET_ID", "DEMO_RESEARCH_AGENT_WALLET_ADDRESS"),
    "data_vendor": ("DEMO_DATA_VENDOR_AGENT_WALLET_ID", "DEMO_DATA_VENDOR_AGENT_WALLET_ADDRESS"),
    "sms": ("DEMO_SMS_AGENT_WALLET_ID", "DEMO_SMS_AGENT_WALLET_ADDRESS"),
    "inference": ("DEMO_INFERENCE_AGENT_WALLET_ID", "DEMO_INFERENCE_AGENT_WALLET_ADDRESS"),
    "compromised": ("DEMO_COMPROMISED_AGENT_WALLET_ID", "DEMO_COMPROMISED_AGENT_WALLET_ADDRESS"),
    "treasury": ("AGENTGUARD_TREASURY_WALLET_ID", "AGENTGUARD_TREASURY_WALLET_ADDRESS"),
}


def main() -> None:
    agent = os.environ.get("AGENT", "research")
    if agent not in AGENT_ENV_MAP:
        print(f"error: AGENT must be one of {list(AGENT_ENV_MAP)}")
        sys.exit(1)
    amount_str = os.environ.get("AMOUNT_USDC", "1.0")

    wallet_id_var, addr_var = AGENT_ENV_MAP[agent]
    wallet_id = os.environ.get(wallet_id_var)
    wallet_address = os.environ.get(addr_var)
    if not wallet_id or not wallet_address:
        print(f"error: {wallet_id_var} or {addr_var} not set in .env")
        sys.exit(1)

    from circlekit import GatewayClientSync
    from circlekit.wallets import CircleTxExecutor, CircleWalletSigner

    signer = CircleWalletSigner(wallet_id=wallet_id, wallet_address=wallet_address)
    executor = CircleTxExecutor(wallet_id=wallet_id, wallet_address=wallet_address)
    client = GatewayClientSync(chain="arcTestnet", signer=signer, tx_executor=executor)

    try:
        print(f"agent:   {agent}")
        print(f"wallet:  {wallet_address}")
        print(f"chain:   {client.chain_name}")
        print()

        print("checking balances before deposit...")
        before = client.get_balances()
        print(f"  wallet USDC:  {before.wallet.formatted}")
        print(f"  gateway:      {before.gateway.formatted_available} available")
        print()

        print(f"depositing {amount_str} USDC into Gateway... (this may take 30-60s)")
        result = client.deposit(amount_str)
        print(f"  deposit tx: {result.transaction_hash if hasattr(result, 'transaction_hash') else result}")
        print()

        print("checking balances after deposit...")
        after = client.get_balances()
        print(f"  wallet USDC:  {after.wallet.formatted}")
        print(f"  gateway:      {after.gateway.formatted_available} available")
    finally:
        client.close()


if __name__ == "__main__":
    main()
