"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import clsx from "clsx";

interface Props {
  label: string;
  value: number;
  tone: "green" | "yellow" | "red" | "blue";
  icon?: React.ElementType;
}

const toneMap = {
  green: { text: "text-accent-green", border: "border-accent-green/25", bg: "bg-accent-green/5" },
  yellow: { text: "text-accent-yellow", border: "border-accent-yellow/25", bg: "bg-accent-yellow/5" },
  red: { text: "text-accent-red", border: "border-accent-red/25", bg: "bg-accent-red/5" },
  blue: { text: "text-accent-blue", border: "border-accent-blue/25", bg: "bg-accent-blue/5" },
} as const;

export function StatCard({ label, value, tone, icon: Icon }: Props) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 30, stiffness: 120 });
  const display = useTransform(spring, (latest) =>
    Math.round(latest).toLocaleString(),
  );

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  const { text, border, bg } = toneMap[tone];

  return (
    <div className={clsx("rounded-xl border p-3 text-center", border, bg)}>
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <motion.div className={clsx("mt-1 font-mono text-2xl tabular-nums", text)}>
        {display}
      </motion.div>
    </div>
  );
}
