import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  Fingerprint,
  ScrollText,
  AlertTriangle,
  Brain,
  ArrowRight,
  Zap,
  Lock,
  Code2,
  Terminal,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";

const layers = [
  {
    icon: Lock,
    name: "Kill switch",
    desc: "Operator can pause any agent's wallet instantly; in-flight payments bounce.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
    border: "border-accent-yellow/30",
  },
  {
    icon: Fingerprint,
    name: "ERC-8004 identity",
    desc: "Every sender and recipient is verified against the on-chain IdentityRegistry.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    border: "border-accent-purple/30",
  },
  {
    icon: ShieldCheck,
    name: "Policy",
    desc: "YAML-defined rules: spend caps, allowlists, approval flows, per-recipient limits.",
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    border: "border-accent-blue/30",
  },
  {
    icon: AlertTriangle,
    name: "Anomaly",
    desc: "Z-score vs. the agent's historical baseline. First-time recipients flagged.",
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/10",
    border: "border-accent-cyan/30",
  },
  {
    icon: Brain,
    name: "Intent (Claude Haiku 4.5)",
    desc: "Semantic analysis of the payment intent. Catches prompt injection in English.",
    color: "text-accent-pink",
    bg: "bg-accent-pink/10",
    border: "border-accent-pink/30",
  },
  {
    icon: ScrollText,
    name: "On-chain audit receipt",
    desc: "Every decision written to Arc as a nanopayment memo. Non-repudiable.",
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    border: "border-accent-green/30",
  },
];

const facts = [
  {
    value: "$0.0001",
    label: "per governance check",
    tint: "bg-gradient-to-br from-blue-50 to-blue-100/60",
    numColor: "text-accent-blue",
  },
  {
    value: "6",
    label: "agents in the live economy",
    tint: "bg-gradient-to-br from-violet-50 to-violet-100/60",
    numColor: "text-accent-purple",
  },
  {
    value: "50ms",
    label: "kill switch response time",
    tint: "bg-gradient-to-br from-emerald-50 to-emerald-100/60",
    numColor: "text-accent-green",
  },
  {
    value: "100%",
    label: "decisions written on-chain",
    tint: "bg-gradient-to-br from-cyan-50 to-cyan-100/60",
    numColor: "text-accent-cyan",
  },
];

// Layout rhythm:
//   • every section spans the full viewport width (own bg can tint edge-to-edge)
//   • inner container caps content at ~1280–1440px for readability
//   • horizontal padding adapts to screen size
const CONTAINER = "mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen">
      <NavBar />

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden pb-24 pt-20">
        {/* Edge-to-edge subtle grid */}
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        {/* Large color wash */}
        <div
          className="pointer-events-none absolute left-1/2 top-24 h-[540px] w-[1200px] max-w-[95vw] -translate-x-1/2 rounded-[50%] opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse, rgba(37,99,235,0.22) 0%, rgba(124,58,237,0.15) 45%, transparent 70%)",
          }}
        />
        {/* Corner accent orbs */}
        <div className="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-accent-blue/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-accent-purple/15 blur-3xl" />

        <div className={`${CONTAINER} relative`}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-blue/30 bg-white/80 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent-blue shadow-sm backdrop-blur">
              <Zap className="h-3 w-3" />
              Agentic Economy on Arc · Agent-to-Agent Payment Loop
            </div>
            <h1 className="font-display text-[48px] font-bold leading-[1.02] tracking-tight text-primary md:text-[88px]">
              Every AI agent payment,
              <br />
              <span className="text-gradient">governed.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
              The governance layer for autonomous agent payments on{" "}
              <span className="text-secondary">Circle Nanopayments</span>. Identity,
              policy, anomaly, intent, and audit — all on{" "}
              <span className="text-secondary">Arc</span>. Three lines of SDK code.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-lg bg-accent-blue px-6 py-3 font-medium text-white shadow-glow transition hover:bg-accent-blue/90"
              >
                Open live dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-panel px-6 py-3 font-medium text-secondary transition hover:border-accent-red/60 hover:text-accent-red"
              >
                <AlertTriangle className="h-4 w-4" />
                Watch an attack blocked
              </Link>
            </div>

            {/* Fact strip — wider + colored tiles */}
            <div className="mt-16 grid w-full grid-cols-2 gap-4 md:grid-cols-4">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className={`relative overflow-hidden rounded-2xl border border-white/70 ${f.tint} p-6 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-card-lg`}
                >
                  <div className={`font-display text-4xl font-bold tabular-nums md:text-5xl ${f.numColor}`}>
                    {f.value}
                  </div>
                  <div className="mt-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {f.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= PIPELINE / 6 LAYERS ================= */}
      <section className="relative overflow-hidden border-y border-line/60 bg-white/70 py-24 backdrop-blur">
        <div className={`${CONTAINER} relative`}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-blue">
              The pipeline
            </div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-primary md:text-5xl">
              Six layers between the agent and the money.
            </h2>
            <p className="mt-4 text-lg text-muted">
              Each payment runs through every check, cheapest-first. If any layer
              blocks, USDC never leaves. If approved, the decision settles on Arc and
              an audit receipt is written to chain.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {layers.map((l, i) => (
              <div
                key={l.name}
                className="card-hover relative overflow-hidden rounded-2xl border border-white/70 bg-bg-panel p-6 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${l.border} ${l.bg}`}>
                    <l.icon className={`h-5 w-5 ${l.color}`} strokeWidth={2.2} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">
                    layer {i}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-primary">
                  {l.name}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {l.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= INTEGRATION ================= */}
      <section className="relative py-24">
        <div className={`${CONTAINER} relative`}>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-blue">
                Integration
              </div>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-primary md:text-5xl">
                Three lines.
                <br />
                Every framework.
              </h2>
              <p className="mt-5 text-lg text-muted">
                Point your agent at AgentGuard instead of Circle. We run governance,
                forward the approved call, return the receipt. No wallet re-custody,
                no change to your agent framework.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  "Claude Agent SDK",
                  "LangChain",
                  "AutoGen",
                  "CrewAI",
                  "Mastra",
                ].map((fw) => (
                  <span
                    key={fw}
                    className="rounded-md border border-line bg-white px-3 py-1.5 font-mono text-[12px] text-secondary shadow-sm"
                  >
                    {fw}
                  </span>
                ))}
              </div>
              <div className="mt-7 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 font-mono text-[14px] text-primary shadow-sm">
                  <Terminal className="h-4 w-4 text-accent-green" />
                  <span className="text-muted">$</span> pip install agentguard-protocol
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b0e19] shadow-card-lg">
              <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-accent-red/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent-yellow/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent-green/60" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  research_agent.py
                </span>
              </div>
              <pre className="overflow-auto p-6 font-mono text-[13px] leading-relaxed text-slate-100">
                <code>
                  <span className="text-accent-purple">from</span>{" "}
                  <span className="text-slate-100">agentguard</span>{" "}
                  <span className="text-accent-purple">import</span>{" "}
                  <span className="text-slate-100">AgentGuard</span>
                  {"\n\n"}
                  <span className="text-slate-100">guard</span>{" "}
                  <span className="text-slate-400">=</span>{" "}
                  <span className="text-accent-yellow">AgentGuard</span>
                  <span className="text-slate-400">(</span>
                  {"\n    "}
                  <span className="text-accent-cyan">agent_id</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-accent-green">&quot;research-agent-v1&quot;</span>
                  <span className="text-slate-400">,</span>
                  {"\n    "}
                  <span className="text-accent-cyan">policy_file</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-accent-green">&quot;policies/research.yaml&quot;</span>
                  <span className="text-slate-400">,</span>
                  {"\n    "}
                  <span className="text-accent-cyan">circle_wallet_id</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-accent-green">&quot;...&quot;</span>
                  <span className="text-slate-400">,</span>
                  {"\n"}
                  <span className="text-slate-400">)</span>
                  {"\n\n"}
                  <span className="text-slate-500"># every payment passes through 6 checks</span>
                  {"\n"}
                  <span className="text-slate-100">receipt</span>{" "}
                  <span className="text-slate-400">=</span>{" "}
                  <span className="text-slate-100">guard</span>
                  <span className="text-slate-400">.</span>
                  <span className="text-accent-yellow">pay</span>
                  <span className="text-slate-400">(</span>
                  {"\n    "}
                  <span className="text-accent-cyan">to_agent_id</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-accent-green">&quot;data-vendor-agent-v1&quot;</span>
                  <span className="text-slate-400">,</span>
                  {"\n    "}
                  <span className="text-accent-cyan">amount_usdc</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-accent-blue">0.001</span>
                  <span className="text-slate-400">,</span>
                  {"\n    "}
                  <span className="text-accent-cyan">intent</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-accent-green">&quot;Buy Q3 macro stats report&quot;</span>
                  <span className="text-slate-400">,</span>
                  {"\n"}
                  <span className="text-slate-400">)</span>
                  {"\n\n"}
                  <span className="text-accent-purple">if</span>{" "}
                  <span className="text-slate-400">not</span>{" "}
                  <span className="text-slate-100">receipt</span>
                  <span className="text-slate-400">.</span>
                  <span className="text-slate-100">approved</span>
                  <span className="text-slate-400">:</span>
                  {"\n    "}
                  <span className="text-accent-purple">print</span>
                  <span className="text-slate-400">(</span>
                  <span className="text-accent-green">f&quot;blocked: </span>
                  <span className="text-slate-400">{"{"}</span>
                  <span className="text-slate-100">receipt</span>
                  <span className="text-slate-400">.</span>
                  <span className="text-slate-100">reason</span>
                  <span className="text-slate-400">{"}"}</span>
                  <span className="text-accent-green">&quot;</span>
                  <span className="text-slate-400">)</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ECONOMICS ================= */}
      <section className="relative overflow-hidden border-y border-line/60 py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 50%, #fdf4ff 100%)",
          }}
        />
        <div className={`${CONTAINER} relative`}>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-blue">
                Why nanopayments
              </div>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-primary md:text-5xl">
                Only economically viable on{" "}
                <span className="text-gradient">Circle Nanopayments</span>.
              </h2>
              <p className="mt-5 text-lg text-muted">
                At $0.30 per Stripe transaction, charging $0.0001 per governance check
                is physically impossible. On Circle Nanopayments + Arc, it&apos;s
                routine — a busy agent pays us a few dollars a day, we settle every
                decision on chain.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-white/80 p-5 shadow-card">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    Stripe
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold text-secondary line-through decoration-accent-red/70">
                    $1,500,000 <span className="text-sm font-normal text-muted">/ day</span>
                  </div>
                </div>
                <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-accent-red">
                  impossible
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white/80 p-5 shadow-card">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    Circle Nanopayments
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold text-accent-green">
                    $0 <span className="text-sm font-normal text-muted">/ day fees</span>
                  </div>
                </div>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-accent-green">
                  native
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER CTA ================= */}
      <section className="relative py-24">
        <div className={`${CONTAINER} relative`}>
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-center md:p-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(148,163,184,0.15) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-blue/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-24 h-64 w-64 rounded-full bg-accent-purple/30 blur-3xl" />

            <div className="relative flex flex-col items-center gap-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple shadow-glow-strong">
                <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
                Every payment. Every agent. Governed.
              </h2>
              <p className="max-w-xl text-white/70">
                Three lines of SDK. Real Circle Nanopayments on Arc. Identity, policy,
                anomaly, and Claude Haiku 4.5 intent classification — all on chain.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-slate-900 shadow-card-lg transition hover:bg-white/90"
                >
                  Open the live dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://github.com/agentguard/agentguard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Code2 className="h-4 w-4" />
                  Source on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-line/60 bg-white/50 py-8 text-center font-mono text-xs text-subtle">
        agentguard protocol · circle nanopayments · arc testnet · erc-8004
      </footer>
    </main>
  );
}
