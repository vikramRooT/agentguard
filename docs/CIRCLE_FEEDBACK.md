# Circle Product Feedback

> Submitted with the AgentGuard entry for the **Agentic Economy on Arc**
> hackathon (Apr 20–25, 2026). Reflects findings from building and shipping
> a real product against Circle Developer-Controlled Wallets, Nanopayments,
> Gateway, x402, and Arc Testnet. Numbers below are pulled from our live
> Railway-hosted API on the day of submission, not made up.

---

## Which Circle products did we use, and how?

| Product | How we used it |
| --- | --- |
| **Developer-Controlled Wallets** | Provisioned 6 demo agent wallets via `@circle-fin/developer-controlled-wallets` v8.4.1. All payments and audit receipts in production were initiated via `client.createTransaction(...)`. |
| **USDC on Arc Testnet** | The asset every agent transacts in. Treasury wallet collects per-decision governance fees; audit-receipt nanopayments encode each decision's metadata. |
| **Arc Testnet** | Settlement and audit layer. Chain ID `5042002`, USDC contract `0x3600…0000`. Sub-second finality is what makes synchronous governance viable inside an agent's request cycle. |
| **`circle-titanoboa-sdk` (`circlekit`)** | Bundled as the optional `agentguard[circle]` extra in our published Python SDK for the x402-protected service flow. |
| **Arc Block Explorer (`testnet.arcscan.app`)** | Every governance decision links out to its on-chain audit receipt. |

Not used in this submission: CCTP / Bridge Kit (relevant post-hackathon for
multi-chain governance), thirdweb facilitator (we use the Circle SDK
directly), Circle Mint (not a fit for the governance use-case).

## Why Circle, not another rail

AgentGuard's core differentiator is that **every governance decision is
cryptographically anchored on-chain**. The economics only work on a rail
where per-decision settlement is gas-free at agent-economy scale:

| Rail | Cost at 5M decisions/day | Verdict |
| --- | --- | --- |
| Stripe events | ~$1.5M/day (3 c × 5M) | Off the table |
| L2 (Base, Optimism) gas | ~$50k/day (1 c × 5M) | Burns the margin |
| Solana (low priority) | ~$1.25k/day (0.025 c × 5M) | Workable but volatile fee market |
| **Circle Nanopayments + Arc** | **$0/day** — gas absorbed by Gateway batching, USDC is the gas | **The only rail this product is viable on** |

The "AgentGuard is only economically possible on this rail" line is the
strongest argument we make in our pitch. It's also true.

---

## What worked exceptionally well

**1. Developer-Controlled Wallets onboarding was fast.**
From `CIRCLE_API_KEY` to first signed `createTransaction` call: about 90
minutes, most of it spent reading the Entity Secret docs. The
`registerEntitySecretCiphertext` flow is unusual but the docs walk through
it cleanly. We wrote our `register-entity-secret.ts` once and never
touched it again.

**2. Bulk wallet provisioning is honest about its rate limits.**
Our `pnpm seed` script creates 6 wallets and gets them funded. We did not
hit a 429 during the hackathon — the operation completes in under 8
seconds. For a 100+ wallet enterprise rollout we'd want a published
ceiling, but for our scale the latency was a non-issue.

**3. Arc Testnet was rock-solid for the entire build window (Apr 20-24).**
Zero RPC outages observed across 84 governed payments hitting production.
The mean settlement-confirmed latency we measured end-to-end was 5.6
seconds (this includes our full 5-layer pipeline including Claude Haiku
calls, not just the Arc tx). The Arc tx itself is well under a second.

**4. USDC-as-native-gas is a genuine ergonomic win.**
We never had to bridge ETH or any second asset. The agents fund themselves
with testnet USDC from the faucet and that's the only currency on the
rail. For a payments product this collapses an entire onboarding step.

**5. Sample tx the judges can verify on Arc Block Explorer:**
- Approved A2A payment: <https://testnet.arcscan.app/tx/0xa26848a83a9f94da6ffb35b2c1f18f45aba837be4e0a81a82e9f706d64c0a71c>
- Approved A2A payment: <https://testnet.arcscan.app/tx/0x3fcb6b2fc6016c22e51e34b4b57d88d289d48e059de9606087df265d13e2914c>
- Audit receipt for an approved decision: <https://testnet.arcscan.app/tx/0x69d53f2111e38d612a43e5c6563a6a4a69a0f2d3b343ac316b9f7719c9da3004>
- Audit receipt for a blocked decision: <https://testnet.arcscan.app/tx/0x81ed7bf3b772bf2d2ff959311b5ce459b4c816be413106607b9bfcfa0714264e>

Treasury wallet (collects governance fees + audit receipts):
<https://testnet.arcscan.app/address/0x82af8a89f1121b752781e2e2df9d10e4b985a4ec>

---

## Concrete papercuts we hit

**1. The `Blockchain` enum in the Node SDK doesn't include `ARC-TESTNET`.**
`@circle-fin/developer-controlled-wallets` v8.4.1's TypeScript types ship
an enum that omits the value the API actually accepts at runtime. We had
to cast: `blockchain: "ARC-TESTNET" as never`. The runtime behaviour was
correct; the type definition was the issue. For a chain that's a flagship
in this hackathon, the SDK types should just include it. **Estimated fix:
one PR adding the enum value.**

**2. The Authorization header rejects any whitespace, including `\r`.**
We pushed environment variables to Railway from a Windows-CRLF `.env` file
via a bash script. The trailing `\r` got injected into `CIRCLE_API_KEY`,
which the SDK then placed verbatim into the `Authorization` header. Node's
HTTP layer threw `TypeError [ERR_INVALID_CHAR]: Invalid character in
header content ["Authorization"]` and the SDK fell through to its mock
fallback silently, so we didn't notice for an hour. **Suggestion: the SDK
could call `.trim()` on the API key during client construction, or surface
the error explicitly instead of letting the underlying HTTP error bubble
up.** Most users will not realize their key has invisible whitespace.

**3. There's no native wallet-pause / freeze / guardian role.**
We pitched AgentGuard as having a "kill switch" — operator pauses an
agent's wallet and any in-flight payment immediately bounces. The Wallets
API doesn't expose a `wallet.pause()` or `wallet.freeze()` endpoint. We
fell back to an application-level `paused: bool` flag in our DB checked at
the top of the pipeline, plus an on-chain `SpendingLimiter.revoke_agent()`
guard contract for the deeper enforcement story. Both work, but neither is
"the wallet itself refuses to send" — which is what an enterprise security
team will actually want. **A first-class guardian-wallet primitive (a
secondary wallet that can pause or veto txs from a primary) would be huge
for any safety/compliance product on Circle.**

**4. No vanilla `transfer(to, amount)` between wallets.**
The Gateway story is buyer→x402-protected-URL. Our hero demo is two
agents transacting; we had a clear "Agent A pays Agent B 0.001 USDC for a
report" mental model. Realising "you'll need to spin up an x402 endpoint
on Agent B's side" added scope. We worked around it by going directly
through `createTransaction` on Developer-Controlled Wallets, but a
first-class `gateway.transfer(fromWallet, toWallet, amount)` would have
saved us a day. The marketing positions A2A payments as an obvious
use-case; the API expects you to think in buyer/seller roles.

**5. Nanopayment memo isn't an arbitrary-bytes field.**
We wanted to encode our governance-decision metadata directly in the
settlement memo: `{agent_id, decision, layer_traces[], policy_version}`.
We didn't find a Wallets-API path to attach arbitrary bytes to a
transaction. We pivoted to a separate audit-receipt nanopayment per
decision (same idea, double the txs) and a Merkle-root commitment scheme
for batches. Works, but more on-chain footprint than necessary. **A
standardised "audit event" memo schema would benefit every compliance/
safety product on Circle.**

**6. Docs gap between marketing and reference.**
The public `circle.com/wallets` page lists supported chains but didn't
include Arc when we checked. We had to dig into `circlekit`'s
`constants.py` to confirm Arc Testnet support, chain ID 5042002, Gateway
domain 26. A single authoritative chain-matrix page that mirrors
`circlekit/constants.py` would save hours.

**7. Arc Block Explorer URL convention.**
We initially defaulted to `testnet.arcscan.com`. The actual hostname is
`testnet.arcscan.app`. Tiny papercut; would help if `arc.network` docs
explicitly listed the explorer domain alongside the RPC endpoint.

---

## Recommendations (in priority order)

**1. Ship a "Circle Agent Safety Toolkit"** — official reference
implementations of policy engine, rate limiter, audit trail, kill switch,
and guardian-wallet role. Make safety a first-class category in the docs.
Every enterprise AI deployment will eventually hit our use-case; making
Circle the obvious safety foundation is a defensible distribution wedge.
We're happy to contribute AgentGuard's pipeline upstream as a reference.

**2. Add a guardian-wallet role to Developer-Controlled Wallets** — a
secondary wallet that can pause or veto transactions from a primary,
authenticated by signature. This is structurally what we built; a native
primitive would be cleaner, more secure, and unlock a whole compliance
product surface.

**3. Add `gateway.transfer(fromWallet, toWallet, amount)` to the SDK** —
for teams that don't want to spin up an x402 service per agent. The
buyer-seller framing is right for marketplaces; raw A2A is a different
shape. Both should be one line.

**4. Standardise a governance-event memo schema** — even an opinionated
JSON-LD layout. Once teams encode `{agent_id, decision, trace_hash,
policy_version}` consistently, you get instant interoperability across
every audit/compliance product on Circle.

**5. Strip whitespace in `Authorization` header construction** — and/or
`.trim()` the API key during client construction, with a `console.warn`
when whitespace was stripped. Will save the next dev who hits the same
CRLF bug we did several hours.

**6. Include `ARC-TESTNET` in the Blockchain enum** in
`@circle-fin/developer-controlled-wallets` types. One-line PR.

**7. Promote the "every decision on-chain" narrative in marketing** — the
$1.5M/day Stripe vs $0/day Nanopayments comparison is a slide every CFO
will nod at. Underused right now; this is the strongest argument for
choosing Circle over any other rail for agent-economy infrastructure.

---

## Hackathon-day numbers (live, not made up)

- **Lifetime governed decisions on the production deployment:** 84
- **Approved payments (real Circle settlement on Arc):** 80
- **Blocked payments (incident audit receipts only):** 2
- **Mean approved-path end-to-end latency:** 5.6 s (5-layer pipeline + Circle settlement + Arc audit-receipt write)
- **Per-tx cost on the rail:** $0 (gas-free batched settlement)
- **Treasury revenue model:** $0.0001 USDC per governance check, paid as a nanopayment on Arc

The dashboard at <https://agentguard-kappa.vercel.app/dashboard> shows the
live numbers — you can refresh and they'll be larger by the time you read
this. Every entry in the feed has a clickable Arc Block Explorer link so
you can verify any of these on-chain.

---

*Submitted by the AgentGuard team — solo build by [Vikram Naidu](https://github.com/vikramRooT).
Repo: <https://github.com/vikramRooT/agentguard>. SDK on PyPI:
`pip install agentguard-protocol`.*
