# AgentGuard — submission video script

**Target length:** 3 minutes (≤ 180s)
**Format:** screen recording + voiceover
**Resolution:** 1920×1080, browser zoomed to 110–125%
**Mandatory hackathon shots embedded:** Circle Developer Console transaction + Arc Block Explorer verification

---

## Pre-flight (15 minutes before recording)

### Tabs open in this order
1. **Dashboard** — <https://agentguard-kappa.vercel.app/dashboard>
2. **Demo page** — <https://agentguard-kappa.vercel.app/demo>
3. **Circle Developer Console** — <https://console.circle.com> → Developer Wallets → Transactions
4. **Arc Block Explorer (treasury wallet)** — <https://testnet.arcscan.app/address/0x82af8a89f1121b752781e2e2df9d10e4b985a4ec>
5. **GitHub repo** — <https://github.com/vikramRooT/agentguard>

### Start the live traffic simulator
PowerShell:
```powershell
$env:API_BASE_URL="https://agentguard-api-production.up.railway.app"; pnpm sim
```
**Wait 60 seconds before recording.** Dashboard should show 30+ transactions, throughput chart drawing, protocol revenue past $0.0030, 4/6 agents active.

### Final checks
- [ ] Mic tested
- [ ] Phone on silent
- [ ] OBS / screen recorder at 1920×1080, 30fps
- [ ] Browser at 110–125% zoom
- [ ] Both demo page + dashboard visible (don't have to switch every time — practice the tab order)
- [ ] Have this script open on a second monitor

---

# THE SCRIPT (word for word)

> Read it once cold. Then practice the click order silently. Then record.
> The narration is paced for ~150 words/minute. Every italic line is what you say.

---

## Beat 1 — Cold open (0:00 – 0:15)

**Screen:** Dashboard, full page, traffic flowing. Cursor still.

> *"AI agents are about to handle real money. But the rails they're forced to use are broken for this. Give the agent raw wallet keys, and one prompt injection drains your treasury. Put a human in the loop on every payment, and you've killed the autonomy you built the agent for. AgentGuard is the third option."*

---

## Beat 2 — What AgentGuard is (0:15 – 0:35)

**Screen:** Dashboard. Cursor moves slowly through the four top metric cards, then down to the throughput chart.

> *"AgentGuard is the governance layer for AI agent payments on Circle Nanopayments. Every payment an autonomous agent makes flows through five layers — kill switch, ERC-8004 identity, policy, anomaly detection, and Claude — before settling as USDC on Arc. Three lines of SDK code. The agent keeps its autonomy. The operator gets a policy file, an audit log, and a kill switch."*

---

## Beat 3 — The dashboard tour (0:35 – 1:00)

**Screen:** Stay on dashboard. Cursor points at:
1. HeroMetric counter (left big card)
2. The Approved volume / Blocked attacks / **Protocol revenue** cards
3. Throughput chart bars drawing in real time
4. Agent roster on the right

> *"Here's the live operator console. Top row: governed payments per minute, total USDC volume settled, blocked attacks, and protocol revenue — every governance check earns AgentGuard one-hundredth of a cent, paid on-chain to our treasury wallet. Below, the live throughput from a running agent-to-agent economy — four agents transacting continuously in real time. Each row in this feed is a real Circle nanopayment that just settled on Arc."*

---

## Beat 4 — Real on-chain proof (1:00 – 1:30) ⭐ **MANDATORY SHOTS**

**Screen:** Switch to **Circle Developer Console** tab. Show the transactions list with fresh transactions landing.

> *"These payments are real. Here's our Circle Developer Wallets console with live transactions hitting the Arc Testnet API right now."*

**Screen:** Switch to **Arc Block Explorer** tab — the treasury wallet's transaction list.

> *"And here on the public Arc block explorer is our treasury wallet. Every single USDC entering this wallet is a one-hundredth-of-a-cent governance fee from a real check we just ran. This is the entire revenue model — running on a chain anyone can audit. No screenshots, no faked numbers."*

---

## Beat 5 — The hero attack (1:30 – 2:05) ⭐ **THE MONEY SHOT**

**Screen:** Tab to **`/demo`** page.

> *"Now the attack. The compromised agent on our network just got hit with a prompt injection — maybe it processed a phishing email, maybe its system prompt got hijacked upstream. We don't care how. We care that it can't move USDC out without our pipeline saying yes. Watch what happens when it tries."*

**Action:** Click the red **"Trigger attack"** button (the only one with a Hero badge).

**Screen:** Tab back to **dashboard** *immediately*.

> *"The compromised agent fires. The legitimate rail keeps processing around it. And the incident card just dropped in red on the right."*

**Action:** Click the new red incident card. The trace modal opens.

> *"Five layers ran. Three passed — including ERC-8004 identity. This agent has a valid on-chain identity, it looks legitimate. But..."*

**Cursor:** Point at the anomaly row.

> *"...anomaly says it's the first time this agent has ever paid this recipient, and the amount is eight thousand standard deviations above its baseline. Block."*

**Cursor:** Point at the intent row.

> *"And Claude Haiku 4.5 reads the actual intent text — quote, 'payment intent contains explicit instruction override' — that's the prompt injection signature. Block. Total latency under five seconds. Audit receipt written to Arc. The legitimate rail never paused."*

**Action:** Close modal. Stay on dashboard.

---

## Beat 6 — Why this only works on Circle (2:05 – 2:40) 🧠 **THE BUSINESS CASE**

**Screen:** Stay on dashboard, OR cut to a slide showing the cost comparison table.

> *"Now the business case — and this is the part most submissions don't have."*
>
> *"AgentGuard's pitch is that every governance decision is anchored on-chain. That's the only way the operator's CFO can sleep at night when an autonomous agent is moving real money. At enterprise scale — say, five million decisions a day across a fleet of agents — what does it cost to write each decision somewhere durable?"*
>
> *(slowly, deliberately, like a punchline)*
>
> *"On Stripe, with their thirty-cent event fee, one and a half million dollars a day."*
>
> *"On Layer 2 gas — Base, Optimism — fifty thousand a day."*
>
> *"On Solana with low priority — about a thousand a day."*
>
> *"On Circle Nanopayments settling on Arc — zero. Gas-free, because Gateway batches authorizations into a single Arc transaction. USDC is the native gas on Arc, so there's no separate token to bridge. Sub-second finality, so we can run the audit synchronously inside the agent's request cycle."*
>
> *"Per-decision audit logging — the entire premise of safety infrastructure for AI agents — is only economically viable on this rail. AgentGuard isn't 'a product that uses Circle.' It's a product that **requires** Circle. Anywhere else, the unit economics break."*

---

## Beat 7 — Close (2:40 – 3:00)

**Screen:** Back to dashboard. Counter still ticking.

> *"Built solo in five days. Live right now at agentguard-kappa.vercel.app. The Python SDK is on PyPI — `pip install agentguard-protocol`. Open-source under MIT on GitHub. Eighty real Circle settlements on Arc, two attacks blocked, every one of them verifiable on the public block explorer."*
>
> *(beat)*
>
> *"AgentGuard. Every AI agent payment, governed."*

**Final frame:** <https://github.com/vikramRooT/agentguard> visible, dashboard counter climbing in the corner.

---

# Click + tab order — single sheet (memorize this)

| Time | Tab | Action | Visual cue |
|---|---|---|---|
| 0:00 | Dashboard | Hit record. Stay still. | Counter ticking |
| 0:35 | Dashboard | Move cursor across cards | Hover each metric briefly |
| 1:00 | **Circle Console** | Switch tab | Mandatory shot — let it linger 5s |
| 1:15 | **Arc Explorer** | Switch tab | Mandatory shot — show treasury list |
| 1:30 | Demo page | Switch tab | About to fire attack |
| 1:35 | Demo page | **Click "Trigger attack"** (red Hero button) | |
| 1:40 | Dashboard | Switch tab | Watch compromised row light up red |
| 1:50 | Dashboard | **Click new red incident card** | Modal opens |
| 1:55 | Modal | Cursor on anomaly row, then intent row | Narrate trace |
| 2:05 | Dashboard | Close modal | Back to overview |
| 2:40 | Dashboard | Tab to GitHub for closing shot | |

---

# The "why only Circle" argument — memorize the punchline

These four numbers are your strongest slide. Memorize them in order:

| Rail | Per-decision cost | At 5M decisions/day |
|---|---|---|
| **Stripe events** | $0.30 | **$1,500,000 / day** |
| **L2 gas** (Base/Optimism) | ~$0.01 | ~$50,000 / day |
| **Solana** (low priority) | ~$0.0002 | ~$1,000 / day |
| **Circle Nanopayments + Arc** | **$0** (batched, gas-free) | **$0 / day** |

The killer line: *"AgentGuard isn't a product that uses Circle. It's a product that **requires** Circle."*

Why exactly:
- **Gateway batching**: many EIP-712 authorizations settle in one Arc tx — gas amortized
- **USDC as native gas on Arc**: no separate ETH/SOL/MATIC needed
- **Sub-second Arc finality**: governance can run *synchronously* inside the agent's request, not async
- **No volatile fee market** (unlike Solana where compute units spike on demand)

Drop those bullets in if a judge asks "but why not [other rail]?"

---

# What to do if something breaks during recording

| Failure | Recovery |
|---|---|
| Demo button hangs / 500s | Wait 5s, click again. Buttons are idempotent. |
| Compromised agent didn't show up red | Click the row in the LEFT panel (Payment Feed) — same modal opens |
| Simulator died mid-recording | Don't restart on camera. Pre-built activity stays on the dashboard. |
| Claude API rate-limit | Won't happen at this volume, but if it does: hero attack still blocks via anomaly layer |
| Mic glitch | Stop, restart, do a fresh take. Don't try to splice. |

**Safety net:** Record one full clean take FIRST as a backup, before you do the live take. The live one will be tighter; the backup is insurance against a flake.

---

# After recording

1. Watch the take front-to-back. Cut filler, fix pauses.
2. Export at 1920×1080, MP4, ≤ 100 MB.
3. Upload to YouTube (unlisted) or Vimeo for the lablab submission link.
4. Stop the simulator (`Ctrl+C` in the terminal — don't burn Claude credits overnight).

---

# Frequently asked questions (likely judge questions)

**Q: Is the prompt injection real, or hardcoded?**
> *"The injection text is the test stimulus — it's the kind of intent string an actual injected agent would produce. The defense is real: Claude Haiku 4.5 reads it, classifies it, and our pipeline blocks. Whether the agent was injected by an email or a system-prompt override or a tool-call hijack doesn't matter to the defense; we run on the intent text the agent's tool call carries."*

**Q: How is this different from other Agent-to-Agent submissions?**
> *"Every other submission in this track is a marketplace — agents paying agents for services. AgentGuard is the governance layer those marketplaces need. We're not competing with AgentBazaar or AgenticTrade — we're the picks-and-shovels every one of them should plug in to govern their flows."*

**Q: What about CCTP, Bridge Kit, Circle Mint?**
> *"Out of scope for this submission, but obvious next steps. CCTP is for multi-chain governance — same SDK, more rails. Bridge Kit unlocks cross-chain audit trails."*

**Q: Why ERC-8004 specifically?**
> *"It's the emerging standard for autonomous agent identity — sponsor-aligned, on-chain verifiable. Verifying both sender and recipient lets us catch impersonation attacks before any policy check runs."*

**Q: Is the kill switch on-chain?**
> *"Honest answer: there's no native wallet-pause primitive in the Circle Wallets API today, so the kill switch is application-level — checked at the top of our pipeline before any payment fires. We do have an on-chain `SpendingLimiter.revoke_agent` Vyper contract for the deeper enforcement story. We've requested a guardian-wallet primitive in our Circle Product Feedback writeup."*

---

You're ready. Go record.
