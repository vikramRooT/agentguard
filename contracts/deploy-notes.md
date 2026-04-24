# Deployment notes — ERC-8004 registry on Arc testnet

> Filled in by Engineer A on Day 3 after validating the Vyper toolchain.

## Steps

1. Clone the sponsor repo `ERC-8004-vyper` (linked from the hackathon page).
2. Install Vyper + Titanoboa:
   ```bash
   pip install vyper titanoboa
   ```
3. Compile the `IdentityRegistry.vy` and `ReputationRegistry.vy` artifacts.
4. Deploy to Arc testnet via Titanoboa (or using the provided deploy script).
5. Copy the deployed address into `contracts/README.md` and `.env`:
   ```
   ERC8004_REGISTRY_ARC_TESTNET=0x...
   ```
6. Update `apps/api/src/services/erc8004_identity.ts` to call the registry
   instead of returning stub results.

## Things to verify

- [ ] The registry accepts `registerAgent(agentId, ownerAddress, metadataURI)` calls.
- [ ] Reputation reads are cheap enough to call on every governed payment
      (target: <20ms round-trip at Arc RPC).
- [ ] Revocation path works — can mark an identity as compromised and have
      the registry reject it.
- [ ] Fits within our 500ms end-to-end pipeline budget.
