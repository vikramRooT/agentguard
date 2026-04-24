"use client";

import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Check, X, AlertTriangle, ArrowRight, Zap } from "lucide-react";
import type { PaymentRow } from "@/lib/api";
import { Avatar } from "./Avatar";

interface Props {
  rows: PaymentRow[];
  onSelect?: (row: PaymentRow) => void;
}

const decisionConfig = {
  approved: {
    icon: Check,
    dot: "bg-accent-green",
    text: "text-accent-green",
    pillBg: "bg-emerald-50 border-emerald-200 text-accent-green",
    label: "Approved",
  },
  blocked: {
    icon: X,
    dot: "bg-accent-red",
    text: "text-accent-red",
    pillBg: "bg-red-50 border-red-200 text-accent-red",
    label: "Blocked",
  },
  escalated: {
    icon: AlertTriangle,
    dot: "bg-accent-yellow",
    text: "text-accent-yellow",
    pillBg: "bg-amber-50 border-amber-200 text-accent-yellow",
    label: "Escalated",
  },
} as const;

function shortAgent(id: string): string {
  const trimmed = id.replace(/-v\d+$/, "");
  if (trimmed.length > 20) return trimmed.slice(0, 10) + "…";
  return trimmed;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AgentFeed({ rows, onSelect }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg-panel shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <Zap className="h-3.5 w-3.5 text-accent-blue" strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Payment feed
            </div>
            <div className="font-display text-[13px] font-semibold text-primary">
              {rows.length} recent · last hour
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-green">
          <span className="live-dot" />
          live
        </div>
      </div>

      <div className="max-h-[640px] overflow-auto scrollbar-thin">
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <div className="shimmer-bar h-0.5 w-40 rounded-full bg-line" />
            <p className="text-sm font-medium text-primary">Waiting for traffic</p>
            <p className="font-mono text-[11px] text-muted">
              run <code className="rounded bg-bg-soft px-1.5 py-0.5">pnpm sim</code>{" "}
              to start continuous A2A payments
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {rows.map((row, idx) => {
            const cfg = decisionConfig[row.decision];
            const recipient =
              row.to_agent_id ?? row.to_wallet_address ?? "(external)";
            return (
              <motion.button
                layout
                key={row.request_id}
                initial={
                  idx === 0
                    ? { opacity: 0, x: -6, backgroundColor: "rgba(37,99,235,0.08)" }
                    : false
                }
                animate={{
                  opacity: 1,
                  x: 0,
                  backgroundColor: "rgba(0,0,0,0)",
                  transition: { duration: 0.8 },
                }}
                exit={{ opacity: 0 }}
                onClick={() => onSelect?.(row)}
                className="group flex w-full items-center gap-4 border-b border-line/60 px-5 py-3 text-left transition hover:bg-bg-soft/70"
              >
                {/* time column */}
                <div className="w-[58px] shrink-0 font-mono text-[10px] text-subtle tabular-nums">
                  {formatTime(row.created_at)}
                </div>

                {/* status pill */}
                <div
                  className={clsx(
                    "flex h-6 shrink-0 items-center gap-1 rounded-md border px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                    cfg.pillBg,
                  )}
                >
                  <cfg.icon className={clsx("h-2.5 w-2.5", cfg.text)} strokeWidth={3} />
                  {cfg.label}
                </div>

                {/* flow */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar seed={row.agent_id} size={24} />
                  <span className="truncate font-mono text-[12.5px] font-medium text-primary">
                    {shortAgent(row.agent_id)}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-subtle" />
                  <Avatar seed={recipient} size={24} />
                  <span className="truncate font-mono text-[12.5px] text-secondary">
                    {recipient.startsWith("0x")
                      ? `${recipient.slice(0, 6)}…${recipient.slice(-4)}`
                      : shortAgent(recipient)}
                  </span>
                </div>

                {/* amount */}
                <div className="w-[110px] shrink-0 text-right">
                  <div className="font-mono text-[13px] font-semibold text-primary tabular-nums">
                    {row.amount_usdc.toFixed(4)}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-subtle">
                    USDC
                  </div>
                </div>

                {/* latency */}
                <div className="w-[60px] shrink-0 text-right font-mono text-[11px] text-muted tabular-nums">
                  {row.latency_ms.toFixed(0)}ms
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
