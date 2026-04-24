# Circle Product Feedback (draft)

> Required submission field. Reflects real findings from building AgentGuard
> on top of Circle Nanopayments + Gateway + x402 + Arc Testnet during the
> Agentic Economy on Arc hackathon (Apr 20–26, 2026). Refined through Day 5
> with live usage numbers.

---

## Which Circle products did you use?

1. **Circle Nanopayments (via Circle Gateway + x402)** — the core primitive.
   Every governed payment AgentGuard approves results in an EIP-712
   `TransferWithAuthorization` signed off-chain and settled on Arc in a
   Gateway batch.
2. **Circle Gateway** — unified USDC balance for buyer agents; sellers
   receive payments via `create_gateway_middleware()`.
3. **Arc Testnet (Layer 1)** — settlement + governance commitment layer.
   Sub-second finality is what makes synchronous governance viable inside
   an agent's request cycle.
4. **Circle Developer-Controlled Wallets (planned)** — `circlekit.wallets`
   adapters (`CircleWalletSigner`, `CircleTxExecutor`) so agent private keys
   never leave Circle infrastructure.
5. **USDC on Arc** — both the asset being governed and the denomination of
   our per-decision audit commitments.

Not used in the submission: x402 via thirdweb facilitator (we use Gateway's
built-in batching facilitator through `circlekit`), CCTP / Bridge Kit
(relevant post-hackathon for multi-chain).

## Why did we choose these products?

AgentGuard's compliance differentiator is that **every governance decision
is cryptographically anchored on-chain**. At agent-economy scale, per-decision
on-chain writes are economically impossible on any rail except Gateway:

| Rail | Cost at 5M decisions/day |
|---|---|
| Stripe events | $1,500,000/day (0.30 × 5M) |
| L2 gas | ~$50,000/day (0.01 × 5M) |
| Solana | ~$1,250/day (0.00025 × 5M) |
| **Circle Nanopayments (batched)** | **$0/day — gas absorbed by bulk settlement** |

We use a batched Merkle commitment (see ARCHITECTURE.md) so many decisions
share one Arc tx's proof. This is the only architecture where writing
governance to public infra breaks even.

## What worked well

*(Fill in with concrete numbers from Days 2–4)*

- **`circlekit` onboarding** — the Python SDK is remarkably cohesive.
  Installing once and calling `GatewayClient(chain="arcTestnet",
  private_key=key).pay(url)` just worked. Time from clone to first
  settled nanopayment: **[minutes]**.
- **`create_gateway_middleware()` for sellers** — dropping x402 protection
  onto a FastAPI endpoint was a one-import plus one line per route. Much
  lower friction than expected.
- **Arc Testnet uptime during the hackathon** — we observed [X]% uptime
  across our [N]-minute simulator runs. Sub-second finality held at
  **[p50 / p95]**.
- **Gateway/Arc contract addresses were easy to find** — the
  `docs.arc.network/arc/references/contract-addresses` page was accurate
  for Gateway Wallet, Gateway Minter, CCTP V2.
- **Gateway Domain IDs** are clearly documented and match `circlekit`
  constants. Multi-chain was obvious.
- **USDC-as-native-gas** is a genuine ergonomic win — we did not have to
  bridge ETH to pay for contract deploys.

## What could be improved

- **No wallet-level pause / freeze / guardian primitive.** Our kill switch
  is application-level because the Wallets API doesn't expose a
  `wallet.pause()` or "guardian" role. A first-class pause primitive would
  be valuable for any safety/compliance product. For now we fall back to
  an AgentGuard-level flag plus an on-chain `SpendingLimiter.revoke_agent()`
  call — works, but isn't "stop this wallet instantly."
- **No built-in agent-to-agent wallet transfer.** Gateway is
  buyer→seller-URL oriented; "Agent A transfers N USDC to Agent B" has no
  direct primitive. We reframed our A2A demo around "Agent A pays for Agent
  B's x402-protected endpoint" which works, but a vanilla `gateway.transfer(to, amount)`
  would have avoided the reframe.
- **Nanopayment memo / metadata** — we wanted to encode decision-trace
  metadata directly in the settlement memo. Didn't find a way to attach
  arbitrary bytes. Switched to our Merkle-root commitment scheme. A
  standardized "audit event" memo schema would help every compliance/safety
  product built on Circle.
- **Docs gap between marketing and API reference** — e.g., the public
  `www.circle.com/wallets` page lists supported chains but doesn't include
  Arc; we had to pull `circlekit`'s `constants.py` to confirm Arc Testnet
  support + chain ID 5042002 + Gateway domain 26. A single authoritative
  chain-matrix page would save hours.
- **Arc Block Explorer memo display** — [record observed behavior]. If
  memos render raw / UTF-8 vs hex, that shapes how we design the
  "human-readable audit explorer" feature.
- **Rate limit visibility** — we hit [X] wallet-creation calls / minute in
  `pnpm seed`. Published ceilings (per-key, per-wallet, per-chain)
  would let platforms plan bulk provisioning.
- **`circlekit` threading** — the README honestly flags that titanoboa's
  `boa.env` isn't thread-safe. Clear and appreciated. A worker-pool-safe
  mode would unlock higher parallelism.

## Recommendations

1. **Ship a "Circle Agent Safety Toolkit"** — reference implementations for
   policy engine, rate limiting, audit trail, kill switch, guardian
   wallet role. AgentGuard can contribute patterns upstream. Making safety
   first-class in the Circle docs makes Circle the obvious foundation for
   enterprise agent deployments.
2. **Standardize a governance-event memo schema** — JSON-LD or structured
   bytes encoding `{agent_id, decision, trace_hash, policy_version, ...}`.
   Interop across every product that writes audit events on Arc.
3. **First-class guardian role in Wallets** — a wallet that can pause or
   reject transactions from a primary wallet. Our product is structurally
   a guardian; a native primitive would be cleaner and more secure than
   an application-level flag.
4. **Native `gateway.transfer(to, amount)`** — for teams who do want raw
   wallet-to-wallet A2A without spinning up an x402 endpoint. Today this
   requires either `deposit → withdraw` (the withdraw path is cross-chain
   oriented) or running a seller service per agent.
5. **Partner-distribute `circlekit` into agent frameworks** — LangChain,
   AutoGen, Claude Agent SDK, CrewAI. A Circle-certified safety + payments
   middleware inside those frameworks = massive adoption lane.
6. **Promote the "safety layer" narrative in Circle marketing** — the
   pitch "Circle Nanopayments is the only rail where every agent decision
   can be cryptographically logged on-chain" is underused. Enterprise AI
   deployments will pick the rail that answers their CFO's governance
   question.

---

## Appendix: what we generated on-chain

*(Fill in after Day 4 recording session)*

- Total governed decisions during recording: `____`
- Total on-chain Arc txs (Gateway batches): `____`
- Batch ratio (decisions per Arc tx): `____`
- p50 / p95 settlement latency: `____ / ____ ms`
- Representative Arc Block Explorer links:
  - `https://testnet.arcscan.app/tx/____` (biggest batch)
  - `https://testnet.arcscan.app/tx/____` (a blocked demo attack receipt)
  - `https://testnet.arcscan.app/tx/____` (ERC-8004 agent registration)
  - `https://testnet.arcscan.app/tx/____` (SpendingLimiter deploy)
  - `https://testnet.arcscan.app/tx/____` (a standard A2A payment)
