"use client";

import clsx from "clsx";

interface Props {
  label?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function HeroBanner({ label, title, description, right, className }: Props) {
  return (
    <section
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-line",
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
      }}
    >
      {/* Pattern texture — dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
        }}
      />
      {/* Color accent orbs */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.6) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col gap-5 px-7 py-7 md:flex-row md:items-center md:justify-between md:px-10 md:py-9">
        <div className="max-w-2xl">
          {label && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 backdrop-blur">
              <span className="live-dot" />
              {label}
            </div>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-[32px] md:leading-[1.15]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/60 md:text-[14px]">
              {description}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </section>
  );
}
