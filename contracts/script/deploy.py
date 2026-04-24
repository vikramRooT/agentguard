"""
Deploy AgentGuard's Vyper contracts to Arc Testnet via Titanoboa.

Usage (after `pnpm install` + venv active + ARC_DEPLOYER_PRIVATE_KEY set):

    source .venv/Scripts/activate  # or equivalent on POSIX
    python contracts/script/deploy.py

This deploys (in order):
    1. IdentityRegistry   (ERC-8004 agent identity)
    2. ReputationRegistry (ERC-8004 feedback)
    3. ValidationRegistry (ERC-8004 validation lifecycle)
    4. SpendingLimiter    (AgentGuard on-chain policy enforcement)

Addresses are appended to .env.local so the API picks them up on next restart.

NOTE: This is a Day-3 deliverable. Right now it's a scaffold that validates
    inputs and prints what WOULD be deployed. Fill in the boa.env.prank +
    boa.load() calls once ARC_DEPLOYER_PRIVATE_KEY and testnet USDC are in hand.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = ROOT / "contracts" / "src"

# Load .env from the repo root regardless of CWD.
load_dotenv(ROOT / ".env")

ARC_TESTNET_RPC = os.getenv("ARC_RPC_URL", "https://arc-testnet.drpc.org")
USDC_ARC_TESTNET = os.getenv(
    "ARC_USDC_CONTRACT", "0x3600000000000000000000000000000000000000"
)
DEPLOYER_KEY = os.getenv("ARC_DEPLOYER_PRIVATE_KEY")


def preflight() -> None:
    if not DEPLOYER_KEY:
        print(
            "error: set ARC_DEPLOYER_PRIVATE_KEY before running.\n"
            "  Get testnet USDC via https://faucet.circle.com (Arc Testnet)\n"
            "  The deployer wallet must hold USDC (Arc uses USDC as gas)."
        )
        sys.exit(1)
    for name in ("IdentityRegistry.vy", "ReputationRegistry.vy", "ValidationRegistry.vy", "SpendingLimiter.vy"):
        if not (CONTRACTS / name).is_file():
            print(f"error: missing {CONTRACTS / name}")
            sys.exit(1)


def main() -> None:
    preflight()

    # Lazy import so the scaffold doesn't require boa to be installed at
    # repo-clone time.
    try:
        import boa  # type: ignore[import-untyped]
    except ImportError:
        print(
            "error: titanoboa not installed. Run:\n"
            "  .venv/Scripts/python.exe -m pip install titanoboa vyper"
        )
        sys.exit(1)

    from eth_account import Account

    boa.set_network_env(ARC_TESTNET_RPC)
    account = Account.from_key(DEPLOYER_KEY)
    boa.env.add_account(account, force_eoa=True)
    print(f"deployer: {account.address}")

    addresses: dict[str, str] = {}

    # -----------------------------------------------------------------
    # ERC-8004 suite. ReputationRegistry + ValidationRegistry both take the
    # IdentityRegistry address in their constructor.
    # -----------------------------------------------------------------
    identity_addr = os.getenv("ARC_ERC8004_IDENTITY_REGISTRY")
    if identity_addr:
        print(f"  IdentityRegistry   -> {identity_addr} (reused from .env)")
    else:
        identity = boa.load(str(CONTRACTS / "IdentityRegistry.vy"))
        identity_addr = identity.address
        print(f"  IdentityRegistry   -> {identity_addr}")
    addresses["ARC_ERC8004_IDENTITY_REGISTRY"] = identity_addr

    reputation_addr = os.getenv("ARC_ERC8004_REPUTATION_REGISTRY")
    if reputation_addr:
        print(f"  ReputationRegistry -> {reputation_addr} (reused from .env)")
    else:
        reputation = boa.load(str(CONTRACTS / "ReputationRegistry.vy"), identity_addr)
        reputation_addr = reputation.address
        print(f"  ReputationRegistry -> {reputation_addr}")
    addresses["ARC_ERC8004_REPUTATION_REGISTRY"] = reputation_addr

    validation_addr = os.getenv("ARC_ERC8004_VALIDATION_REGISTRY")
    if validation_addr:
        print(f"  ValidationRegistry -> {validation_addr} (reused from .env)")
    else:
        validation = boa.load(str(CONTRACTS / "ValidationRegistry.vy"), identity_addr)
        validation_addr = validation.address
        print(f"  ValidationRegistry -> {validation_addr}")
    addresses["ARC_ERC8004_VALIDATION_REGISTRY"] = validation_addr

    # -----------------------------------------------------------------
    # AgentGuard on-chain policy enforcement.
    # Windows default open() uses cp1252; SpendingLimiter.vy has Unicode box
    # chars in its comments. Read UTF-8 manually and use boa.loads.
    # -----------------------------------------------------------------
    limiter_addr = os.getenv("ARC_AGENTGUARD_SPENDING_LIMITER")
    if limiter_addr:
        print(f"  SpendingLimiter    -> {limiter_addr} (reused from .env)")
    else:
        src = (CONTRACTS / "SpendingLimiter.vy").read_text(encoding="utf-8")
        limiter = boa.loads(src, USDC_ARC_TESTNET, name="SpendingLimiter")
        limiter_addr = limiter.address
        print(f"  SpendingLimiter    -> {limiter_addr}")
    addresses["ARC_AGENTGUARD_SPENDING_LIMITER"] = limiter_addr

    # -----------------------------------------------------------------
    # Persist
    # -----------------------------------------------------------------
    env_local = ROOT / ".env.local"
    with env_local.open("a", encoding="utf-8") as fh:
        fh.write("\n# === Appended by contracts/script/deploy.py ===\n")
        for key, value in addresses.items():
            fh.write(f"{key}={value}\n")
    print(f"\nwrote {len(addresses)} addresses to {env_local}")
    print("Restart the API so it picks up the new env.")


if __name__ == "__main__":
    main()
