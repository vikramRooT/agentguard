"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Bot,
  Users,
  CircleDollarSign,
  Network,
  Lock,
  Fingerprint,
  ScrollText,
  AlertTriangle,
  Brain,
  FileCode,
  KeySquare,
  Activity,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.08, duration: 0.45 },
  }),
};

export function ArchitectureDiagram() {
  return (
    <div className="relative">
      {/* Connecting line down the middle (desktop only) */}
      <div
        aria-hidden
        className="absolute left-1/2 top-12 hidden h-[calc(100%-6rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-line-strong to-transparent md:block"
      />

      <div className="relative space-y-6">
        {/* Layer 1: Operator */}
        <Layer
          index={0}
          accent="purple"
          tag="Layer 1 · control plane"
          title="Agent operators"
          subtitle="CFOs, security teams, platform engineers"
          items={[
            { icon: FileCode, label: "Write YAML policy" },
            { icon: KeySquare, label: "Hold kill-switch keys" },
            { icon: Activity, label: "Monitor incidents" },
          ]}
        />

        <Connector label="defines policy · holds operator keys" />

        {/* Layer 2: Agents */}
        <Layer
          index={1}
          accent="blue"
          tag="Layer 2 · agent runtime"
          title="Autonomous AI agents"
          subtitle="Claude Agent SDK · LangChain · AutoGen · CrewAI · custom"
          items={[
            { icon: Bot, label: "research-agent" },
            { icon: Bot, label: "data-vendor" },
            { icon: Bot, label: "inference-agent" },
            { icon: Bot, label: "sms-agent" },
          ]}
        />

        <Connector label='guard.pay(...)  ·  3 lines of SDK code' code />

        {/* Layer 3: AgentGuard (the product) */}
        <AgentGuardLayer index={2} />

        <Connector label="settle on Arc · USDC nanopayment + audit receipt" />

        {/* Layer 4: Circle Nanopayments */}
        <Layer
          index={3}
          accent="cyan"
          tag="Layer 3 · payment rail"
          title="Circle Nanopayments"
          subtitle="Developer-Controlled Wallets · Gateway · x402"
          items={[
            { icon: CircleDollarSign, label: "EIP-712 sigs" },
            { icon: Network, label: "Gateway batching" },
            { icon: ShieldCheck, label: "Sub-cent USDC" },
          ]}
        />

        <Connector label="batched settlement · gas-free" />

        {/* Layer 5: Arc */}
        <Layer
          index={4}
          accent="green"
          tag="Layer 4 · settlement & audit"
          title="Arc Testnet"
          subtitle="USDC as native gas · sub-second finality · public block explorer"
          items={[
            { icon: ShieldCheck, label: "On-chain settlement" },
            { icon: ScrollText, label: "Audit receipts" },
            { icon: Users, label: "Public verification" },
          ]}
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// AgentGuard layer — the 5-layer pipeline visualization (the centerpiece)
// --------------------------------------------------------------------------

const PIPELINE = [
  { name: "Kill switch", icon: Lock, color: "yellow" },
  { name: "ERC-8004 identity", icon: Fingerprint, color: "purple" },
  { name: "Policy", icon: ScrollText, color: "blue" },
  { name: "Anomaly", icon: AlertTriangle, color: "cyan" },
  { name: "Intent (Claude)", icon: Brain, color: "green" },
] as const;

function AgentGuardLayer({ index }: { index: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeIn}
      custom={index}
      className="relative overflow-hidden rounded-2xl border-2 border-accent-blue/30 bg-gradient-to-br from-bg-panel via-blue-50/40 to-purple-50/40 p-6 shadow-card-lg md:p-8"
    >
      {/* "highlight this is us" badge */}
      <div className="absolute right-4 top-4 hidden md:block">
        <div className="rounded-full border border-accent-blue/40 bg-white/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent-blue backdrop-blur">
          You are here
        </div>
      </div>

      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-blue">
        AgentGuard · governance pipeline
      </div>
      <h3 className="mt-2 font-display text-2xl font-bold text-primary md:text-3xl">
        Every payment runs five layers in sequence.
      </h3>
      <p className="mt-2 max-w-2xl text-[14px] text-muted">
        The operator's policy + on-chain identity + statistical baselines +
        Claude's read of the agent's intent — all evaluated synchronously
        before the wallet ever signs.
      </p>

      {/* Pipeline strip */}
      <div className="mt-6 hidden md:block">
        <div className="relative grid grid-cols-5 gap-3">
          {PIPELINE.map((layer, i) => {
            const Icon = layer.icon;
            return (
              <motion.div
                key={layer.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card-lg accent-${layer.color}`}
                style={{
                  borderColor:
                    layer.color === "yellow"
                      ? "rgba(217,119,6,0.3)"
                      : layer.color === "purple"
                        ? "rgba(124,58,237,0.3)"
                        : layer.color === "blue"
                          ? "rgba(37,99,235,0.3)"
                          : layer.color === "cyan"
                            ? "rgba(8,145,178,0.3)"
                            : "rgba(5,150,105,0.3)",
                }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    background:
                      layer.color === "yellow"
                        ? "rgba(217,119,6,0.1)"
                        : layer.color === "purple"
                          ? "rgba(124,58,237,0.1)"
                          : layer.color === "blue"
                            ? "rgba(37,99,235,0.1)"
                            : layer.color === "cyan"
                              ? "rgba(8,145,178,0.1)"
                              : "rgba(5,150,105,0.1)",
                  }}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{
                      color:
                        layer.color === "yellow"
                          ? "#d97706"
                          : layer.color === "purple"
                            ? "#7c3aed"
                            : layer.color === "blue"
                              ? "#2563eb"
                              : layer.color === "cyan"
                                ? "#0891b2"
                                : "#059669",
                    }}
                    strokeWidth={2.4}
                  />
                </div>
                <div className="text-center font-display text-[12px] font-semibold leading-tight text-primary">
                  {layer.name}
                </div>
                <div className="absolute -right-1.5 top-1/2 hidden h-px w-3 -translate-y-1/2 bg-line-strong md:block" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile: stacked pipeline */}
      <div className="mt-5 grid grid-cols-2 gap-2 md:hidden">
        {PIPELINE.map((layer) => {
          const Icon = layer.icon;
          return (
            <div
              key={layer.name}
              className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5 text-[12px] font-medium text-primary"
            >
              <Icon className="h-3.5 w-3.5 text-accent-blue" />
              {layer.name}
            </div>
          );
        })}
      </div>

      {/* Decision branches */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent-green">
            Approved
          </div>
          <div className="mt-1 text-[13px] text-primary">
            Settle as USDC nanopayment on Arc + write audit receipt
          </div>
        </div>
        <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent-red">
            Blocked / escalated
          </div>
          <div className="mt-1 text-[13px] text-primary">
            Refuse settlement + write incident audit receipt to Arc
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Generic layer (everyone except AgentGuard)
// --------------------------------------------------------------------------

interface LayerItem {
  icon: React.ElementType;
  label: string;
}

interface LayerProps {
  index: number;
  accent: "purple" | "blue" | "cyan" | "green";
  tag: string;
  title: string;
  subtitle: string;
  items: LayerItem[];
}

const ACCENT_MAP: Record<
  LayerProps["accent"],
  { border: string; iconBg: string; iconText: string; tagText: string }
> = {
  purple: {
    border: "border-accent-purple/25",
    iconBg: "bg-accent-purple/10",
    iconText: "text-accent-purple",
    tagText: "text-accent-purple",
  },
  blue: {
    border: "border-accent-blue/25",
    iconBg: "bg-accent-blue/10",
    iconText: "text-accent-blue",
    tagText: "text-accent-blue",
  },
  cyan: {
    border: "border-accent-cyan/25",
    iconBg: "bg-accent-cyan/10",
    iconText: "text-accent-cyan",
    tagText: "text-accent-cyan",
  },
  green: {
    border: "border-accent-green/25",
    iconBg: "bg-accent-green/10",
    iconText: "text-accent-green",
    tagText: "text-accent-green",
  },
};

function Layer({ index, accent, tag, title, subtitle, items }: LayerProps) {
  const cfg = ACCENT_MAP[accent];
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeIn}
      custom={index}
      className={`relative overflow-hidden rounded-2xl border bg-bg-panel p-5 shadow-card md:p-6 ${cfg.border}`}
    >
      <div className={`font-mono text-[11px] uppercase tracking-[0.18em] ${cfg.tagText}`}>
        {tag}
      </div>
      <div className="mt-1.5 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
        <h3 className="font-display text-xl font-bold text-primary md:text-2xl">
          {title}
        </h3>
        <p className="text-[13px] text-muted">{subtitle}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-1.5 rounded-md border border-line bg-bg-soft px-2.5 py-1 font-mono text-[12px] text-secondary"
            >
              <Icon className={`h-3.5 w-3.5 ${cfg.iconText}`} strokeWidth={2.2} />
              {item.label}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Connector between layers
// --------------------------------------------------------------------------

function Connector({ label, code = false }: { label: string; code?: boolean }) {
  return (
    <div className="relative flex justify-center">
      <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-line-strong md:block" />
      <div
        className={`relative z-10 inline-flex items-center gap-2 rounded-full border border-line bg-bg-panel px-3 py-1 ${
          code ? "font-mono text-[11px]" : "text-[11px]"
        } text-muted shadow-sm`}
      >
        <span className="h-1 w-1 rounded-full bg-accent-blue/60" />
        {label}
        <span className="h-1 w-1 rounded-full bg-accent-blue/60" />
      </div>
    </div>
  );
}
