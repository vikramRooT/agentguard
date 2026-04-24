"use client";

import clsx from "clsx";

// Tailwind-compatible gradient pairs. Deterministic by seed hash so every agent
// gets a consistent avatar across the UI.
const GRADIENTS: Array<[string, string]> = [
  ["#2563eb", "#7c3aed"],
  ["#0891b2", "#2563eb"],
  ["#059669", "#0891b2"],
  ["#d97706", "#dc2626"],
  ["#db2777", "#7c3aed"],
  ["#2563eb", "#0891b2"],
  ["#7c3aed", "#db2777"],
  ["#059669", "#d97706"],
  ["#0ea5e9", "#6366f1"],
  ["#16a34a", "#059669"],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export interface AvatarProps {
  seed: string;
  size?: number;
  label?: string;
  className?: string;
}

export function Avatar({ seed, size = 32, label, className }: AvatarProps) {
  const [a, b] = GRADIENTS[hash(seed) % GRADIENTS.length];
  const text = (label ?? seed).trim();
  // Initials: first two characters, skipping non-letters
  const initials = text
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, text[0]?.toUpperCase() ?? "A");

  return (
    <div
      className={clsx(
        "relative flex shrink-0 items-center justify-center rounded-full font-mono font-semibold text-white shadow-sm",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
        fontSize: Math.max(10, size * 0.36),
      }}
      title={label ?? seed}
    >
      <span>{initials}</span>
    </div>
  );
}
