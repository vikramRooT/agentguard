"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, Activity } from "lucide-react";

interface Props {
  count: number; // cumulative count from metrics
  windowSize?: number; // how many buckets to show
  bucketMs?: number; // bucket width in ms
}

interface Point {
  t: number; // tick index
  time: string;
  payments: number;
}

/**
 * Rolling throughput chart. Takes the cumulative `count` from the overview API
 * and derives per-bucket deltas so we see "payments per bucket" over time.
 */
export function ThroughputChart({ count, windowSize = 24, bucketMs = 3000 }: Props) {
  const [series, setSeries] = useState<Point[]>([]);
  const prev = useRef(count);
  const tick = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const delta = Math.max(count - prev.current, 0);
      prev.current = count;
      tick.current += 1;
      const now = new Date();
      const time = now.toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });
      setSeries((s) =>
        [...s, { t: tick.current, time, payments: delta }].slice(-windowSize),
      );
    }, bucketMs);
    return () => clearInterval(id);
  }, [count, bucketMs, windowSize]);

  const total = series.reduce((acc, p) => acc + p.payments, 0);
  const recent = series[series.length - 1]?.payments ?? 0;
  const avg = series.length > 0 ? total / series.length : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg-panel shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <TrendingUp className="h-3.5 w-3.5 text-accent-blue" strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Live throughput
            </div>
            <div className="font-display text-[13px] font-semibold text-primary">
              Payments per 3s · last {windowSize * (bucketMs / 1000)}s
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-5 md:flex">
          <Metric label="avg" value={avg.toFixed(1)} />
          <Metric label="latest" value={`${recent}`} />
          <Metric label="total" value={`${total}`} tone="blue" />
        </div>
      </div>

      <div className="h-[220px] px-2 py-2">
        {series.length < 2 ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
              <Activity className="h-3.5 w-3.5 animate-pulse text-accent-blue" />
              waiting for signal…
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 12, right: 14, bottom: 6, left: 0 }}>
              <defs>
                <linearGradient id="throughput-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#eef2f7"
                strokeDasharray="3 4"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "ui-monospace" }}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "ui-monospace" }}
                width={28}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "ui-monospace",
                  padding: "6px 10px",
                  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                }}
                labelStyle={{ color: "#64748b", fontSize: 10 }}
                itemStyle={{ color: "#0f172a" }}
              />
              <Area
                type="monotone"
                dataKey="payments"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#throughput-fill)"
                dot={false}
                activeDot={{ r: 4, fill: "#2563eb", stroke: "white", strokeWidth: 2 }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "blue";
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-[9px] uppercase tracking-wider text-subtle">
        {label}
      </span>
      <span
        className={
          tone === "blue"
            ? "font-display text-[15px] font-bold tabular-nums text-accent-blue"
            : "font-display text-[15px] font-bold tabular-nums text-primary"
        }
      >
        {value}
      </span>
    </div>
  );
}
