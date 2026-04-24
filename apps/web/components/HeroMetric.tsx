"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

interface Props {
  count: number;
  volumeUsdc: number;
  perMinute: number;
}

// Large hero tile for the primary metric — gradient background, massive number,
// inline sparkline at the bottom. Spans 2 columns on desktop.
export function HeroMetric({ count, volumeUsdc, perMinute }: Props) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 30, stiffness: 120 });
  const display = useTransform(spring, (l) => Math.round(l).toLocaleString());

  useEffect(() => {
    motionValue.set(count);
  }, [count, motionValue]);

  // Rolling sparkline series of deltas
  const [series, setSeries] = useState<number[]>([]);
  const prev = useRef(count);
  useEffect(() => {
    const delta = Math.max(count - prev.current, 0);
    prev.current = count;
    setSeries((s) => [...s, delta].slice(-32));
  }, [count]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 shadow-card-lg">
      {/* Gradient layered background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #eff6ff 0%, #dbeafe 45%, #ede9fe 100%)",
        }}
      />
      {/* Decorative orbs */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative p-6 md:p-7">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-blue">
              <span className="live-dot" />
              Governed payments · last hour
            </div>
            <div className="mt-1.5 text-[11px] text-accent-purple/80">
              Every payment runs through 5 layers before USDC settles on Arc
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 font-mono text-[10px] font-semibold text-accent-blue shadow-sm backdrop-blur">
            <TrendingUp className="h-3 w-3" />
            {perMinute.toFixed(1)}/min
          </div>
        </div>

        {/* Huge number */}
        <div className="mt-5 flex items-baseline gap-3">
          <motion.span className="font-display text-[72px] font-bold leading-none tracking-tight text-primary tabular-nums md:text-[84px]">
            {display}
          </motion.span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent-blue/70">
            transactions
          </span>
        </div>

        {/* Bottom metrics row */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="flex gap-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Volume
              </div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-display text-[22px] font-bold tabular-nums text-primary">
                  {volumeUsdc.toFixed(4)}
                </span>
                <span className="font-mono text-[10px] font-semibold text-muted">
                  USDC
                </span>
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Rate
              </div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-display text-[22px] font-bold tabular-nums text-primary">
                  {perMinute.toFixed(1)}
                </span>
                <span className="font-mono text-[10px] font-semibold text-muted">
                  /min
                </span>
              </div>
            </div>
          </div>

          {/* Mini sparkline */}
          <InlineSparkline data={series} />
        </div>
      </div>
    </div>
  );
}

function InlineSparkline({ data }: { data: number[] }) {
  const width = 200;
  const height = 56;
  if (data.length < 2) {
    return (
      <svg width={width} height={height}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(37,99,235,0.15)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height * 0.8 - height * 0.1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="hm-sl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#hm-sl)" />
      <path d={line} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
