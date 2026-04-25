# AgentGuard — submission video script

**Target length:** 3:30 – 4:00 minutes
**Format:** screen recording + voiceover
**Resolution:** 1920×1080, browser zoomed to 110–125%
**Mandatory hackathon shots embedded:** Circle Developer Console transaction + Arc Block Explorer verification

---

## Pre-flight (15 minutes before recording)

### Tabs open in this order
1. **Landing page** — <https://agentguard-kappa.vercel.app/>
2. **Dashboard** — <https://agentguard-kappa.vercel.app/dashboard>
3. **Demo page** — <https://agentguard-kappa.vercel.app/demo>
4. **Circle Developer Console** — <https://console.circle.com> → Developer Wallets → Transactions
5. **Arc Block Explorer (treasury wallet)** — <https://testnet.arcscan.app/address/0x82af8a89f1121b752781e2e2df9d10e4b985a4ec>
6. **GitHub repo** — <https://github.com/vikramRooT/agentguard>

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
- [ ] Have this script open on a second monitor

---

# THE SCRIPT (word for word)

> Read it once cold. Then practice the click order silently. Then record.
> Narration paced for ~145 words/minute. Italic = what you say.

---

## Beat 1 — The problem (0:00 – 0:18)

**Screen:** Landing page. Hero section visible.

> *"Every AI agent in 2026 is going to handle money. The two options today are both wrong. Give the agent raw wallet keys, and one prompt injection drains your treasury. Put a human in the loop on every payment, and you've killed the autonomy you built the agent for. AgentGuard is the third option — a thin governance layer that sits between every agent and the rail."*

---

## Beat 2 — What AgentGuard does (0:18 – 0:38)

**Screen:** Stay on landing page. Scroll slowly to the **Architecture** section (the diagram showing operators → agents → AgentGuard → Circle → Arc).

> *"Operators write their policy in YAML — spending caps, allowlists, approval rules. AI agents — built on the Claude Agent SDK, LangChain, AutoGen, anything — make a normal payment call. AgentGuard intercepts it, runs five governance layers — kill switch, ERC-8004 identity, policy, anomaly, and Claude Haiku 4.5 intent — and only then does Circle Nanopayments settle the USDC on Arc. Both approvals and blocks get an on-chain audit receipt."*

---

## Beat 3 — Where AgentGuard sits (0:38 – 1:00)

**Screen:** Stay on the Architecture diagram. Cursor moves vertically through the layers — operator at top → AgentGuard in the middle (where "YOU ARE HERE" tag is) → Arc at the bottom.

> *"The product is this middle band. We don't replace Circle. We don't take custody of the agent's wallet. We don't run on a separate chain. We're a thin policy + audit layer the agent calls instead of Circle directly — the agent's wallet only ever signs transactions our pipeline approved. The operator gets one YAML file, one dashboard, one kill switch. Three lines of SDK code on the agent's side."*

---

## Beat 4 — The 3-line integration (1:00 – 1:25)

**Screen:** Scroll to the **Integration** section on the landing page (dark code block with the Python snippet).

> *"Here's the entire integration."*

(beat — let viewers read the code)

> *"Import AgentGuard. Instantiate it with your agent ID and a policy file. Replace whatever payment call your agent was making with `guard.pay()`. That's it. No wallet re-custody. No smart contract deploy. No change to your agent framework. Already on PyPI — `pip install agentguard-protocol` — version 0.1.1, MIT licensed."*

**Screen:** Briefly scroll to the **Policy as Code** section (the YAML block).

> *"And the operator side is just YAML. Spending caps, allowlists, intent verification sensitivity, approval flows, kill switch — all version-controlled, reviewed in pull requests, deployed atomically."*

---

## Beat 5 — The dashboard tour (1:25 – 1:55)

**Screen:** Switch to the **Dashboard** tab. Cursor walks across the four metric cards, then down.

> *"Here's the live operator console. Top row, left-to-right: governed payments per minute, total USDC volume settled, blocked attacks, and protocol revenue — every governance check earns AgentGuard one-hundredth of a cent paid on-chain. Below, the live throughput chart from a running A2A economy of four agents transacting continuously. Each row in this feed is a real Circle nanopayment that just settled on Arc Testnet. The agent roster on the right shows per-agent counts, with a per-agent kill switch one click away."*

---

## Beat 6 — Real on-chain proof (1:55 – 2:20) ⭐ **MANDATORY HACKATHON SHOTS**

**Screen:** Switch to the **Circle Developer Console** tab. Show the live transactions list.

> *"These payments are real. Here's our Circle Developer Wallets console with live `createTransaction` calls hitting the Arc Testnet API right now — nothing pre-recorded."*

**Screen:** Switch to the **Arc Block Explorer** tab — treasury wallet's transaction list.

> *"And here on the public Arc block explorer is our treasury wallet. Every USDC entering this wallet is a one-hundredth-of-a-cent governance fee from a real check we just ran. The entire revenue model — running on a chain anyone can audit. No screenshots, no mock data."*

---

## Beat 7 — The hero attack (2:20 – 2:55) ⭐ **THE MONEY SHOT**

**Screen:** Tab to **`/demo`** page.

> *"Now the attack. The compromised agent on our network just got hit with a prompt injection — maybe it processed a phishing email, maybe its system prompt got hijacked upstream. We don't care how. Watch what happens when it tries to send."*

**Action:** Click the red **"Trigger attack"** button.

**Screen:** Tab back to **dashboard** *immediately*.

> *"The compromised row lights up red. The legitimate rail keeps processing in the background. Incident card drops in."*

**Action:** Click the new red incident card. Trace modal opens.

> *"Five layers ran. Three passed — including ERC-8004 identity, this agent looks legitimate. But anomaly says it's the first time this agent has paid this recipient and the amount is eight thousand standard deviations above its baseline. Block. And Claude Haiku 4.5 reads the intent text — quote, 'payment intent contains explicit instruction override' — that's the prompt injection signature. Block. Audit receipt written to Arc. Total latency under five seconds. The legitimate rail never paused."*

---

## Beat 8 — Why this only works on Circle (2:55 – 3:30) 🧠 **THE BUSINESS CASE**

**Screen:** Stay on dashboard, OR cut to the cost-comparison slide.

> *"Now the business case — and this is the part most submissions don't have."*
>
> *"AgentGuard's pitch is that every governance decision is anchored on-chain. That's how the operator's CFO sleeps when an autonomous agent is moving real money. At enterprise scale — five million decisions a day across a fleet of agents — what does it cost to write each decision somewhere durable?"*
>
> *(slowly, deliberately)*
>
> *"On Stripe, with their thirty-cent event fee, one and a half million dollars a day."*
>
> *"On Layer 2 gas — Base, Optimism — fifty thousand a day."*
>
> *"On Solana with low priority — about a thousand a day."*
>
> *"On Circle Nanopayments settling on Arc — zero. Gas-free, because Gateway batches authorizations into a single Arc transaction. USDC is the native gas on Arc, so there's no separate token to bridge. Sub-second finality, so we run the audit synchronously inside the agent's request cycle."*
>
> *"Per-decision audit logging — the entire premise of safety infrastructure for AI agents — is only economically viable on this rail. AgentGuard isn't 'a product that uses Circle.' It's a product that **requires** Circle. Anywhere else, the unit economics break."*

---

## Beat 9 — Close (3:30 – 3:45)

**Screen:** Back to dashboard. Counter still ticking. Cut to GitHub repo for final frame.

> *"Built solo in five days. Live right now at agentguard-kappa.vercel.app. SDK on PyPI — `pip install agentguard-protocol`. Open source on GitHub. Eighty real Circle settlements, two attacks blocked, every one verifiable on the public block explorer."*
>
> *(beat)*
>
> *"AgentGuard. Every AI agent payment, governed."*

**Final frame:** <https://github.com/vikramRooT/agentguard> + dashboard counter climbing in the corner.

---

# Click + tab order — single sheet (memorize this)

| Time | Tab | Action | Visual cue |
|---|---|---|---|
| 0:00 | Landing | Hit record. Hero visible. | Static |
| 0:18 | Landing | Scroll slowly to Architecture section | Diagram fills the viewport |
| 0:38 | Landing | Stay on Architecture | Cursor walks layer-by-layer |
| 1:00 | Landing | Scroll to Integration code block | Code is centered |
| 1:18 | Landing | Scroll briefly to Policy YAML | Show the YAML structure |
| 1:25 | Dashboard | Switch tab | Cards + chart + roster visible |
| 1:55 | **Circle Console** | Switch tab | **MANDATORY shot, linger 5s** |
| 2:08 | **Arc Explorer** | Switch tab | **MANDATORY shot, linger 5s** |
| 2:20 | Demo page | Switch tab | Demo cards visible |
| 2:25 | Demo page | **Click "Trigger attack" (red)** | |
| 2:30 | Dashboard | Switch tab | Compromised row lights red |
| 2:40 | Dashboard | **Click red incident card** | Modal opens |
| 2:45 | Modal | Cursor on anomaly row, then intent row | Narrate trace |
| 2:55 | Dashboard | Close modal | Background still ticking |
| 3:30 | GitHub | Final tab swap | Repo URL on screen |

---

# The "why only Circle" punchline (memorize verbatim)

| Rail | Per-decision cost | At 5M decisions/day |
|---|---|---|
| **Stripe events** | $0.30 | **$1,500,000 / day** |
| **L2 gas** (Base/Optimism) | ~$0.01 | ~$50,000 / day |
| **Solana** (low priority) | ~$0.0002 | ~$1,000 / day |
| **Circle Nanopayments + Arc** | **$0** (batched, gas-free) | **$0 / day** |

Killer line: *"AgentGuard isn't a product that uses Circle. It's a product that **requires** Circle."*

The four reasons exactly:
- **Gateway batching** — many EIP-712 authorizations settle in one Arc tx, gas amortized to zero
- **USDC is native gas on Arc** — no separate ETH/SOL/MATIC to bridge
- **Sub-second Arc finality** — governance runs *synchronously* inside the agent's request, not async
- **No volatile fee market** — unlike Solana, where compute units spike on demand

Drop these as bullet answers if a judge asks "but why not [other rail]?"

---

# Where the product story lives in the script

This is the change from the previous draft — the script now talks about the *product*, not just the dashboard:

| Beat | What about the product |
|---|---|
| 1 | Why it exists (the third option) |
| **2** | What it does (5-layer pipeline, end-to-end flow) |
| **3** | **Where it sits architecturally** (the middle band — not Circle, not the agent's wallet) |
| **4** | **How simple integration is** (3 lines of SDK + YAML policy) |
| 5 | The operator surface (dashboard) |
| 6 | The on-chain story (real, public proof) |
| 7 | The defense in action (hero attack) |
| 8 | The business case (only viable on Circle) |
| 9 | The proof of shipping (live, open source, on PyPI) |

---

# What to do if something breaks during recording

| Failure | Recovery |
|---|---|
| Demo button hangs / 500s | Wait 5s, click again. Buttons are idempotent. |
| Compromised row didn't light up | Click the matching row in the LEFT panel (Payment Feed) — same modal opens |
| Simulator died mid-recording | Don't restart on camera. Pre-built activity stays on the dashboard. |
| Claude API rate-limit | Won't happen at this volume — but if it does, the hero attack still blocks via anomaly layer |
| Mic glitch | Stop, restart, do a fresh take. Don't try to splice. |

**Safety net:** Record one full clean take FIRST as a backup before doing the live take. The live one will be tighter; the backup is insurance against a flake.

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

**Q: How do you actually intercept the payment? Doesn't the agent still hold the keys?**
> *"The agent calls our SDK instead of Circle directly. The SDK forwards to our API which runs the pipeline. Only when the pipeline approves does the request go through to Circle's `createTransaction`. The agent's wallet never signs anything we didn't approve, because the agent's tool surface only ever calls into us."*

**Q: What about CCTP, Bridge Kit, Circle Mint?**
> *"Out of scope for this submission, obvious next steps. CCTP unlocks multi-chain governance — same SDK, more rails. Bridge Kit unlocks cross-chain audit trails."*

**Q: Why ERC-8004 specifically?**
> *"It's the emerging standard for autonomous agent identity — sponsor-aligned, on-chain verifiable. Verifying both sender and recipient lets us catch impersonation attacks before any policy check runs."*

**Q: Is the kill switch on-chain?**
> *"Honest answer: there's no native wallet-pause primitive in the Circle Wallets API today, so the kill switch is application-level — checked at the top of our pipeline before any payment fires. We have an on-chain `SpendingLimiter.revoke_agent` Vyper contract for the deeper enforcement story. We've requested a guardian-wallet primitive in our Circle Product Feedback writeup."*

---

You're ready. Go record.
