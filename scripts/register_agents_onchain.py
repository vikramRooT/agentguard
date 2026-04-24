"""Register each Circle Wallet agent on-chain via ERC-8004 IdentityRegistry.

Each agent's Circle Wallet calls IdentityRegistry.register() directly (the
wallet becomes msg.sender on Arc), which mints an ERC-721 token to the
wallet and binds the metadata `agentWallet` to itself.

Prereqs:
    - IdentityRegistry deployed on Arc Testnet (ARC_ERC8004_IDENTITY_REGISTRY in .env)
    - 6 Circle Wallets provisioned (DEMO_*_WALLET_ID in .env)
    - Every wallet that registers needs USDC on Arc for gas
    - circle-developer-controlled-wallets installed in venv

Writes: DEMO_*_ERC8004_AGENT_ID entries back to .env.

Usage:
    cd AgentGuard
    ./.venv/Scripts/python.exe scripts/register_agents_onchain.py
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

try:
    from circle.web3.developer_controlled_wallets import (  # type: ignore[import-untyped]
        TransactionsApi,
    )
    from circle.web3.developer_controlled_wallets.models.abi_parameters_inner import (
        AbiParametersInner,
    )
    from circle.web3.developer_controlled_wallets.models.create_contract_execution_transaction_for_developer_request import (
        CreateContractExecutionTransactionForDeveloperRequest,
    )
    from circle.web3.developer_controlled_wallets.models.fee_level import FeeLevel
    from circle.web3.utils import init_developer_controlled_wallets_client
except ImportError:
    print("error: circle-developer-controlled-wallets not installed in venv")
    sys.exit(1)

REGISTRY = os.getenv("ARC_ERC8004_IDENTITY_REGISTRY")
API_KEY = os.getenv("CIRCLE_API_KEY")
ENTITY_SECRET = os.getenv("CIRCLE_ENTITY_SECRET")

if not REGISTRY or not API_KEY or not ENTITY_SECRET:
    print("error: ARC_ERC8004_IDENTITY_REGISTRY, CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET must all be set")
    sys.exit(1)

AGENTS = [
    ("DEMO_RESEARCH_AGENT_WALLET_ID", "research-agent-v1", "agentguard://research-agent-v1"),
    ("DEMO_DATA_VENDOR_AGENT_WALLET_ID", "data-vendor-agent-v1", "agentguard://data-vendor-agent-v1"),
    ("DEMO_SMS_AGENT_WALLET_ID", "sms-agent-v1", "agentguard://sms-agent-v1"),
    ("DEMO_INFERENCE_AGENT_WALLET_ID", "inference-agent-v1", "agentguard://inference-agent-v1"),
    ("DEMO_COMPROMISED_AGENT_WALLET_ID", "compromised-agent-v1", "agentguard://compromised-agent-v1"),
    ("AGENTGUARD_TREASURY_WALLET_ID", "agentguard-treasury", "agentguard://agentguard-treasury"),
]

SUCCESS = frozenset({"CONFIRMED", "COMPLETE", "CLEARED"})
FAILURE = frozenset({"FAILED", "CANCELLED", "DENIED"})


def submit_register(api: TransactionsApi, wallet_id: str, agent_uri: str) -> str:
    """Call IdentityRegistry.register(string) from the given Circle wallet.

    Uses the single-arg `register(string)` overload (metadata defaults to []).
    Returns the on-chain tx hash once the tx reaches a success state.
    """
    request = CreateContractExecutionTransactionForDeveloperRequest(
        walletId=wallet_id,
        contractAddress=REGISTRY,
        abiFunctionSignature="register(string)",
        abiParameters=[AbiParametersInner(agent_uri)],
        feeLevel=FeeLevel("HIGH"),
    )
    response = api.create_developer_transaction_contract_execution(request)
    data = response.data
    tx_id = getattr(data, "id", None) or getattr(getattr(data, "transaction", None), "id", None)
    if not tx_id:
        raise RuntimeError(f"no tx id in response: {response}")

    # Poll.
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        poll = api.get_transaction(id=tx_id)
        tx = getattr(poll.data, "transaction", None) or poll.data
        state = getattr(tx, "state", "UNKNOWN")
        if state in SUCCESS:
            return getattr(tx, "tx_hash", "") or "(no hash)"
        if state in FAILURE:
            reason = getattr(tx, "error_reason", None) or "(no reason)"
            raise RuntimeError(f"tx {tx_id} {state}: {reason}")
        time.sleep(2)
    raise RuntimeError(f"tx {tx_id} timed out after 120s")


def replace_env_line(text: str, key: str, value: str) -> str:
    import re

    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        return pattern.sub(f"{key}={value}", text)
    return text.rstrip() + f"\n{key}={value}\n"


def main() -> None:
    client = init_developer_controlled_wallets_client(
        api_key=API_KEY, entity_secret=ENTITY_SECRET
    )
    tx_api = TransactionsApi(client)

    env_path = ROOT / ".env"
    env_text = env_path.read_text(encoding="utf-8")
    results = []

    for (env_key, agent_id, agent_uri) in AGENTS:
        wallet_id = os.getenv(env_key)
        if not wallet_id:
            print(f"[skip] {agent_id:<22} {env_key} not set")
            continue
        print(f"[..]   {agent_id:<22} registering (wallet={wallet_id[:8]}...)")
        try:
            tx_hash = submit_register(tx_api, wallet_id, agent_uri)
            print(f"[ok]   {agent_id:<22} tx={tx_hash}")
            results.append((agent_id, env_key, tx_hash))
            env_text = replace_env_line(
                env_text, f"DEMO_{agent_id.upper().replace('-', '_')}_ERC8004_TX", tx_hash
            )
        except Exception as exc:
            print(f"[fail] {agent_id:<22} {exc}")

    env_path.write_text(env_text, encoding="utf-8")
    print()
    print(f"registered {len(results)} agent identities on-chain.")
    print("tx hashes written to .env for future reference.")


if __name__ == "__main__":
    main()
