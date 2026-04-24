"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  History,
  X,
  ExternalLink,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HeroBanner } from "@/components/HeroBanner";
import { fetchIncidents, type IncidentRow } from "@/lib/api";
import { IncidentCard } from "@/components/IncidentCard";

type FilterKind = "all" | "blocked" | "escalated" | "approved";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [selected, setSelected] = useState<IncidentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKind>("all");

  useEffect(() => {
    fetchIncidents(200)
      .then((r) => setIncidents(r.incidents))
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    return {
      all: incidents.length,
      blocked: incidents.filter((i) => i.decision === "blocked").length,
      escalated: incidents.filter((i) => i.decision === "escalated").length,
      approved: incidents.filter((i) => i.decision === "approved").length,
    };
  }, [incidents]);

  const filtered = useMemo(() => {
    if (filter === "all") return incidents;
    return incidents.filter((i) => i.decision === filter);
  }, [incidents, filter]);

  return (
    <AppShell>
      <main className="relative">
      <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-8">
        <HeroBanner
          label="Incident history · signed on chain"
          title="Every block, every escalation, their traces."
          description="Each incident is a tamper-evident record on Arc. Click any card to inspect the full 5-layer trace, the Claude reasoning when it fires, and the on-chain audit receipt."
        />

        {/* Stat strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label="total"
            value={counts.all}
            color="text-primary"
            border="border-line"
          />
          <StatTile
            label="blocked"
            value={counts.blocked}
            color="text-accent-red"
            border="border-accent-red/30"
          />
          <StatTile
            label="escalated"
            value={counts.escalated}
            color="text-accent-yellow"
            border="border-accent-yellow/30"
          />
          <StatTile
            label="approved"
            value={counts.approved}
            color="text-accent-green"
            border="border-accent-green/30"
          />
        </div>

        {/* Filters */}
        <div className="mt-6 flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted" />
          {(["all", "blocked", "escalated", "approved"] as FilterKind[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition",
                filter === f
                  ? "border-accent-blue/50 bg-accent-blue/10 text-accent-blue"
                  : "border-line bg-bg-panel text-muted hover:text-primary",
              )}
            >
              {f} · {counts[f]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading && <LoadingGrid />}
          {!loading && filtered.length === 0 && (
            <div className="col-span-2 flex flex-col items-center gap-3 rounded-2xl border border-line bg-bg-panel p-12 text-center">
              <ShieldCheck className="h-10 w-10 text-accent-green/60" />
              <p className="text-secondary">
                {filter === "all"
                  ? "No incidents recorded yet. The rail is clean."
                  : `No ${filter} incidents.`}
              </p>
              {filter === "all" && (
                <p className="font-mono text-[12px] text-muted">
                  Trigger an attack with{" "}
                  <code className="rounded bg-bg-soft px-1.5 py-0.5 text-secondary">
                    pnpm demo:attack
                  </code>{" "}
                  or run scripted scenarios on the{" "}
                  <Link href="/demo" className="text-accent-blue hover:underline">
                    demo page
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
          <AnimatePresence>
            {!loading &&
              filtered.map((inc) => (
                <IncidentCard
                  key={inc.incident_id}
                  incident={inc}
                  onSelect={setSelected}
                />
              ))}
          </AnimatePresence>
        </div>

        {/* Detail modal */}
        <IncidentDetailModal row={selected} onClose={() => setSelected(null)} />
      </div>
      </main>
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  color,
  border,
}: {
  label: string;
  value: number;
  color: string;
  border: string;
}) {
  return (
    <div className={clsx("rounded-xl border bg-bg-panel p-4", border)}>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={clsx("mt-1 font-display text-3xl font-bold tabular-nums", color)}>
        {value}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative h-[160px] overflow-hidden rounded-xl border border-line bg-bg-panel"
        >
          <div className="shimmer-bar absolute inset-0 opacity-20" />
        </div>
      ))}
    </>
  );
}

function IncidentDetailModal({
  row,
  onClose,
}: {
  row: IncidentRow | null;
  onClose: () => void;
}) {
  const explorer =
    process.env.NEXT_PUBLIC_ARC_BLOCK_EXPLORER || "https://testnet.arcscan.app";

  return (
    <AnimatePresence>
      {row && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6 pt-[4vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl border border-line bg-bg-panel shadow-glow-strong scrollbar-thin"
          >
            <div className="flex items-start justify-between border-b border-line p-5">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  Incident trace
                </div>
                <div className="mt-0.5 font-mono text-sm text-secondary">
                  {row.incident_id.slice(0, 12)}…
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border border-line/60 bg-bg-soft p-1.5 text-muted transition hover:text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Meta label="agent" value={row.agent_id} />
                <Meta
                  label="decision"
                  value={row.decision.toUpperCase()}
                  highlight={
                    row.decision === "blocked"
                      ? "text-accent-red"
                      : row.decision === "escalated"
                        ? "text-accent-yellow"
                        : "text-accent-green"
                  }
                />
                <Meta
                  label="time"
                  value={new Date(row.created_at).toLocaleTimeString()}
                />
                <Meta label="layers" value={`${row.trace.length}`} />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted">
                  Reason
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-secondary">
                  {row.reason}
                </p>
              </div>

              {row.arc_audit_tx_hash && (
                <a
                  href={`${explorer}/tx/${row.arc_audit_tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between rounded-lg border border-line bg-bg-soft px-3 py-2 transition hover:border-accent-blue/50"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted">
                      Audit receipt on Arc
                    </div>
                    <div className="font-mono text-xs text-secondary group-hover:text-accent-blue">
                      {row.arc_audit_tx_hash.slice(0, 20)}…{row.arc_audit_tx_hash.slice(-8)}
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-subtle group-hover:text-accent-blue" />
                </a>
              )}

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted">
                  Layer trace
                </div>
                <div className="mt-2 space-y-2">
                  {row.trace.map((t, i) => {
                    const Icon = t.passed ? CheckCircle2 : t.layer === "intent" ? AlertTriangle : AlertOctagon;
                    return (
                      <div
                        key={i}
                        className={clsx(
                          "rounded-lg border p-3",
                          t.passed
                            ? "border-accent-green/25 bg-accent-green/5"
                            : "border-accent-red/30 bg-accent-red/5",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Icon
                            className={clsx(
                              "mt-0.5 h-3.5 w-3.5 shrink-0",
                              t.passed ? "text-accent-green" : "text-accent-red",
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[12px] font-semibold uppercase tracking-wider text-accent-blue">
                                {t.layer}
                              </span>
                              <span
                                className={clsx(
                                  "font-mono text-[11px]",
                                  t.passed ? "text-accent-green" : "text-accent-red",
                                )}
                              >
                                {t.passed ? "pass" : "fail"} · {t.latency_ms}ms
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-secondary">
                              {t.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Meta({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div className="rounded-lg border border-line/60 bg-bg-soft/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div
        className={clsx(
          "mt-1 truncate font-mono text-sm",
          highlight ?? "text-primary",
        )}
      >
        {value}
      </div>
    </div>
  );
}
