"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import type { IncidentRow } from "@/lib/api";

interface Props {
  incident: IncidentRow;
  flash?: boolean;
  onSelect?: (incident: IncidentRow) => void;
}

const decisionConfig = {
  blocked: {
    icon: AlertOctagon,
    border: "border-accent-red/50",
    bg: "bg-accent-red/5",
    text: "text-accent-red",
    accent: "bg-accent-red",
    label: "BLOCKED",
  },
  escalated: {
    icon: AlertTriangle,
    border: "border-accent-yellow/40",
    bg: "bg-accent-yellow/5",
    text: "text-accent-yellow",
    accent: "bg-accent-yellow",
    label: "ESCALATED",
  },
  approved: {
    icon: CheckCircle2,
    border: "border-accent-green/40",
    bg: "bg-accent-green/5",
    text: "text-accent-green",
    accent: "bg-accent-green",
    label: "APPROVED",
  },
} as const;

export function IncidentCard({ incident, flash, onSelect }: Props) {
  const cfg = decisionConfig[incident.decision];
  const Icon = cfg.icon;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: 20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      onClick={() => onSelect?.(incident)}
      className={clsx(
        "group relative w-full overflow-hidden rounded-xl border p-4 text-left transition card-hover",
        cfg.border,
        cfg.bg,
        flash && "animate-pulse-red shadow-alert",
      )}
    >
      {/* Left accent bar */}
      <div className={clsx("absolute inset-y-0 left-0 w-[3px]", cfg.accent)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div
            className={clsx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              cfg.bg,
              cfg.border,
              "border",
            )}
          >
            <Icon className={clsx("h-3.5 w-3.5", cfg.text)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
                  cfg.text,
                )}
              >
                {cfg.label}
              </span>
              <span className="font-mono text-[10px] text-muted">
                {new Date(incident.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            <div className="mt-1 font-mono text-sm text-primary">
              {incident.agent_id}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition group-hover:text-secondary group-hover:translate-x-0.5" />
      </div>

      <p className="mt-2.5 line-clamp-2 text-sm leading-snug text-secondary">
        {incident.reason}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {incident.trace.slice(0, 5).map((t, i) => (
          <span
            key={i}
            className={clsx(
              "rounded border px-1.5 py-0.5 font-mono text-[10px]",
              t.passed
                ? "border-accent-green/30 bg-accent-green/5 text-accent-green/90"
                : "border-accent-red/40 bg-accent-red/5 text-accent-red/90",
            )}
          >
            {t.layer}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
