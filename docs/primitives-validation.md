# Circle primitive validation

## Summary (confirmed facts, 2026-04-22)

| Primitive                  | Expected                                               | Reality                                   | Decision |
|----------------------------|--------------------------------------------------------|-------------------------------------------|----------|
| Nanopayment on Arc         | Gas-free, sub-second finality                          | Confirmed — gas-free via Gateway batching | Use via `circlekit` |
| Nanopayment memo           | Arbitrary UTF-8 metadata                               | Not supported for arbitrary bytes         | **Merkle-commitment audit model** |
| Wallet pause / freeze      | Native Wallets API endpoint                            | Not exposed                               | **Application-level flag + on-chain `SpendingLimiter.revoke_agent()`** |
| Batch ordering             | Audit before settlement on approval                    | N/A — replaced with Merkle commitments    | Not needed |
| Rate limits (wallet)       | Bulk provisioning works                                | TBD once CIRCLE_API_KEY is live           | TODO |
| Rate limits (nanopayment)  | Sustained 1 tx/sec per wallet                          | TBD once CIRCLE_API_KEY is live           | TODO |
| Arc testnet RPC            | `rpc.testnet.arc.network`                              | Works. `arc-testnet.drpc.org` is a mirror (used by `circlekit`) | Use either |
| Arc chain ID               | —                                                      | **5042002** (0x4cef52)                    | In `.env.example` |
| Arc explorer               | —                                                      | `https://testnet.arcscan.app` (NOT `.com`)| In `.env.example` |
| USDC on Arc Testnet        | —                                                      | **`0x3600000000000000000000000000000000000000`** | In `.env.example` |
| Gateway Wallet on Arc      | —                                                      | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` | Ref only |
| Gateway Minter on Arc      | —                                                      | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` | Ref only |
| Gateway Domain (Arc)       | —                                                      | **26**                                    | Used by `circlekit` |

## What Nanopayments actually is

**Not** per-tx on-chain micropayments. It's Circle Gateway + x402:
- Buyer signs EIP-712 `TransferWithAuthorization` off-chain (instant, free)
- Gateway aggregates many sigs
- Settles batches on-chain
- Neither party pays per-tx gas

Each payment is still provable by its EIP-712 hash. Individual on-chain
per-payment visibility is **not** what the primitive gives you.

## What this changed about AgentGuard's design

1. **Audit log** moved from "nanopayment per decision with memo" →
   "local body + Merkle root commit". Same integrity, batched efficiency.
2. **A2A demo framing** moved from "USDC transfer from A to B" →
   "A pays for B's x402-protected endpoint." More authentic and it's what
   `vyper-agentic-payments/examples/agent-marketplace` demonstrates.
3. **Kill switch** is AgentGuard-API-level + a Vyper-contract revoke path
   on `SpendingLimiter`. Not an on-chain wallet pause primitive — doesn't
   exist as a Wallets API endpoint.

## TODOs that need live credentials

- [ ] Measure real Gateway settlement latency p50/p95 over a 5-minute run.
- [ ] Confirm bulk wallet provisioning throughput (`circlekit` + Circle
      Wallets API — how many wallets per minute?).
- [ ] Confirm sustained payment throughput per wallet.
- [ ] Confirm observed 429 / rate-limit behaviors.
- [ ] Record real Gateway batch sizes (how many authorizations per Arc tx
      during our traffic simulator).
- [ ] Record Arc explorer memo render behavior for our audit commitments.

Each of these becomes a concrete bullet in `docs/CIRCLE_FEEDBACK.md`.

## Reference

- `circlekit/constants.py` (in `vendor/circle-titanoboa-sdk`) is the
  authoritative source for chain IDs, USDC addresses, Gateway domains.
- Arc docs: `https://docs.arc.network`
- Circle Nanopayments overview: `https://developers.circle.com/gateway/nanopayments`
