"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Sparkline } from "./Sparkline";

interface Props {
  count: number;
  volumeUsdc: number;
  perMinute: number;
}

function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 30, stiffness: 120 });
  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
}

export function PaymentCounter({ count, volumeUsdc, perMinute }: Props) {
  const [series, setSeries] = useState<number[]>([]);
  const prevCount = useRef(count);

  // Track count deltas over time to build the sparkline series
  useEffect(() => {
    const delta = count - prevCount.current;
    prevCount.current = count;
    setSeries((prev) => {
      const next = [...prev, Math.max(delta, 0)];
      return next.length > 40 ? next.slice(-40) : next;
    });
  }, [count]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-bg-panel">
      <div className="grid grid-cols-[1fr_auto] items-end gap-6 p-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            <span className="live-dot" />
            Governed payments · 60m
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <AnimatedNumber
              value={count}
              format={(n) => Math.round(n).toLocaleString()}
              className="font-display text-[52px] font-semibold leading-none tracking-tight text-primary tabular-nums"
            />
            <span className="text-[11px] uppercase tracking-wider text-muted">tx</span>
          </div>
          <div className="mt-3 flex gap-5 text-[12px] text-muted">
            <div>
              <span className="text-subtle">volume</span>{" "}
              <AnimatedNumber
                value={volumeUsdc}
                format={(n) => n.toFixed(4)}
                className="font-mono tabular-nums text-secondary"
              />{" "}
              <span className="text-subtle">USDC</span>
            </div>
            <div>
              <span className="text-subtle">rate</span>{" "}
              <AnimatedNumber
                value={perMinute}
                format={(n) => n.toFixed(1)}
                className="font-mono tabular-nums text-secondary"
              />
              <span className="text-subtle">/min</span>
            </div>
          </div>
        </div>
        <div className="-mb-1 shrink-0">
          <Sparkline data={series} stroke="#2563eb" width={180} height={56} />
        </div>
      </div>
      {/* Bottom accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-blue/40 to-transparent" />
    </div>
  );
}
