"use client";

import { useId, useMemo } from "react";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 180,
  height = 48,
  stroke = "#2563eb",
  fill = "rgba(37,99,235,0.14)",
  className,
}: Props) {
  const path = useMemo(() => {
    if (data.length < 2) {
      return { line: "", area: "" };
    }
    const min = Math.min(...data, 0);
    const max = Math.max(...data, 1);
    const range = max - min || 1;
    const step = width / (data.length - 1);

    const points = data.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height * 0.85 - height * 0.075;
      return { x, y };
    });

    const line = points
      .map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`))
      .join(" ");
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { line, area };
  }, [data, width, height]);

  const gradientId = useId();

  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#e5e7eb"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} />
      <path d={path.line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.length > 0 && (() => {
        const lastX = (data.length - 1) * (width / (data.length - 1));
        const min = Math.min(...data, 0);
        const max = Math.max(...data, 1);
        const range = max - min || 1;
        const lastY = height - ((data[data.length - 1] - min) / range) * height * 0.85 - height * 0.075;
        return (
          <>
            <circle cx={lastX} cy={lastY} r={4} fill={stroke} fillOpacity={0.2} />
            <circle cx={lastX} cy={lastY} r={2} fill={stroke} />
          </>
        );
      })()}
    </svg>
  );
}
