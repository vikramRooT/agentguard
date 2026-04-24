"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import clsx from "clsx";

type Tone = "blue" | "green" | "red" | "yellow" | "purple" | "cyan" | "slate";

const toneMap: Record<
  Tone,
  { icon: string; iconBg: string; chip: string; cardTint: string }
> = {
  blue: {
    icon: "text-accent-blue",
    iconBg: "bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300/50",
    chip: "bg-accent-blue/10 text-accent-blue border-blue-200",
    cardTint: "bg-gradient-to-br from-white to-blue-50/40",
  },
  green: {
    icon: "text-accent-green",
    iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-300/50",
    chip: "bg-accent-green/10 text-accent-green border-emerald-200",
    cardTint: "bg-gradient-to-br from-white to-emerald-50/40",
  },
  red: {
    icon: "text-accent-red",
    iconBg: "bg-gradient-to-br from-red-100 to-red-200 border-red-300/50",
    chip: "bg-accent-red/10 text-accent-red border-red-200",
    cardTint: "bg-gradient-to-br from-white to-red-50/40",
  },
  yellow: {
    icon: "text-accent-yellow",
    iconBg: "bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300/50",
    chip: "bg-accent-yellow/10 text-accent-yellow border-amber-200",
    cardTint: "bg-gradient-to-br from-white to-amber-50/40",
  },
  purple: {
    icon: "text-accent-purple",
    iconBg: "bg-gradient-to-br from-violet-100 to-violet-200 border-violet-300/50",
    chip: "bg-accent-purple/10 text-accent-purple border-violet-200",
    cardTint: "bg-gradient-to-br from-white to-violet-50/40",
  },
  cyan: {
    icon: "text-accent-cyan",
    iconBg: "bg-gradient-to-br from-cyan-100 to-cyan-200 border-cyan-300/50",
    chip: "bg-accent-cyan/10 text-accent-cyan border-cyan-200",
    cardTint: "bg-gradient-to-br from-white to-cyan-50/40",
  },
  slate: {
    icon: "text-slate-600",
    iconBg: "bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300/50",
    chip: "bg-slate-100 text-secondary border-slate-200",
    cardTint: "bg-gradient-to-br from-white to-slate-50/40",
  },
};

interface Props {
  label: string;
  value: number;
  format?: (n: number) => string;
  tone: Tone;
  icon: React.ElementType;
  delta?: string;
  suffix?: string;
}

export function BigStatCard({
  label,
  value,
  format,
  tone,
  icon: Icon,
  delta,
  suffix,
}: Props) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 30, stiffness: 120 });
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
  const display = useTransform(spring, (l) => fmt(l));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  const cfg = toneMap[tone];

  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-xl border border-white/70 p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-lg",
        cfg.cardTint,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={clsx(
            "flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm",
            cfg.iconBg,
          )}
        >
          <Icon className={clsx("h-5 w-5", cfg.icon)} strokeWidth={2.2} />
        </div>
        {delta && (
          <span
            className={clsx(
              "rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
              cfg.chip,
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {label}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <motion.span className="font-display text-[32px] font-bold leading-none tracking-tight text-primary tabular-nums">
            {display}
          </motion.span>
          {suffix && (
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-subtle">
              {suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
