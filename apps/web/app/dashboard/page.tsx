"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Coins, Wallet } from "lucide-react";
import {
  fetchAgents,
  fetchOverview,
  fetchIncidents,
  openEventStream,
  type DashboardEvent,
  type IncidentRow,
  type OverviewResponse,
  type PaymentRow,
} from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { HeroBanner } from "@/components/HeroBanner";
import { HeroMetric } from "@/components/HeroMetric";
import { BigStatCard } from "@/components/BigStatCard";
import { ThroughputChart } from "@/components/ThroughputChart";
import { AgentFeed } from "@/components/AgentFeed";
import { IncidentCard } from "@/components/IncidentCard";
import { PaymentDetailModal } from "@/components/PaymentDetailModal";
import { AgentRoster } from "@/components/AgentRoster";

const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_WALLET ?? "0xOperator";

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [flashIncidentId, setFlashIncidentId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const startedRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [ov, inc, ag] = await Promise.all([
          fetchOverview(),
          fetchIncidents(50),
          fetchAgents(),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setRows(ov.recent_payments);
        setIncidents(inc.incidents);
        setPaused(
          Object.fromEntries(ag.agents.map((a) => [a.agent_id, a.paused])),
        );
      } catch {}
    };
    load();
    const t = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const close = openEventStream(onEvent);
    return close;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onEvent(ev: DashboardEvent): void {
    if (
      ev.type === "payment.approved" ||
      ev.type === "payment.blocked" ||
      ev.type === "payment.escalated"
    ) {
      const row = ev.payload as PaymentRow;
      setRows((prev) => [row, ...prev].slice(0, 200));
      setOverview((prev) => {
        if (!prev) return prev;
        const totals = { ...prev.totals };
        totals.total += 1;
        if (row.decision === "approved") {
          totals.approved += 1;
          totals.volume_usdc += row.amount_usdc;
        } else if (row.decision === "blocked") totals.blocked += 1;
        else totals.escalated += 1;
        const pa = [...prev.per_agent];
        const e = pa.find((x) => x.agent_id === row.agent_id);
        if (e) {
          e.count += 1;
          if (row.decision === "approved") e.volume_usdc += row.amount_usdc;
        } else
          pa.push({ agent_id: row.agent_id, count: 1, volume_usdc: row.amount_usdc });
        // Bump the protocol revenue locally so the card ticks per-tx
        // instead of waiting for the 10s overview refresh.
        const protocol = prev.protocol
          ? {
              ...prev.protocol,
              lifetime_checks: prev.protocol.lifetime_checks + 1,
              revenue_lifetime_usdc: Number(
                (prev.protocol.revenue_lifetime_usdc + prev.protocol.fee_per_check_usdc).toFixed(6),
              ),
              revenue_last_hour_usdc: Number(
                (prev.protocol.revenue_last_hour_usdc + prev.protocol.fee_per_check_usdc).toFixed(6),
              ),
            }
          : prev.protocol;
        return { ...prev, totals, per_agent: pa, protocol };
      });
    }
    if (ev.type === "incident.new") {
      const inc = ev.payload as IncidentRow;
      setIncidents((prev) => [inc, ...prev].slice(0, 50));
      setFlashIncidentId(inc.incident_id);
      setTimeout(() => setFlashIncidentId(null), 2000);
    }
    if (ev.type === "agent.paused") {
      setPaused((p) => ({ ...p, [ev.payload.agent_id]: true }));
    }
    if (ev.type === "agent.unpaused") {
      setPaused((p) => ({ ...p, [ev.payload.agent_id]: false }));
    }
  }

  const pausedCount = Object.values(paused).filter(Boolean).length;

  const perMinute = useMemo(() => {
    if (!overview) return 0;
    const elapsedMin = Math.max((Date.now() - startedRef.current) / 60_000, 1);
    return overview.totals.total / elapsedMin;
  }, [overview]);

  const t = overview?.totals;
  const blockedRate =
    t && t.total > 0 ? ((t.blocked / t.total) * 100).toFixed(1) : "0.0";

  return (
    <AppShell>
      <main className="relative">
        <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-8">
          {/* ==== HERO BANNER ==== */}
          <HeroBanner
            label={`${pausedCount > 0 ? `${pausedCount} agent${pausedCount === 1 ? "" : "s"} paused` : "Operating · real-time"}`}
            title="Operator governance console"
            description="Every AI agent payment flows through five layers — kill switch, ERC-8004 identity, policy, anomaly, and Claude Haiku 4.5 intent — before settling on Arc. Full trace written on-chain. Per-agent kill switch is in the roster on the right."
            right={
              <div
                className={
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider backdrop-blur " +
                  (pausedCount > 0
                    ? "border-red-400/40 bg-red-500/10 text-red-200"
                    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200")
                }
              >
                <span
                  className={
                    pausedCount > 0
                      ? "h-1.5 w-1.5 rounded-full bg-red-400"
                      : "h-1.5 w-1.5 rounded-full bg-emerald-400"
                  }
                />
                {pausedCount > 0 ? `${pausedCount} paused` : "all sending agents up"}
              </div>
            }
          />

          {/* ==== KEY METRICS (hero + 3 secondary) ==== */}
          <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <HeroMetric
              count={t?.total ?? 0}
              volumeUsdc={t?.volume_usdc ?? 0}
              perMinute={perMinute}
            />
            <BigStatCard
              label="Approved volume"
              value={t?.volume_usdc ?? 0}
              format={(n) => n.toFixed(4)}
              tone="green"
              icon={Coins}
              suffix="USDC"
              delta={`${t?.approved ?? 0} tx`}
            />
            <BigStatCard
              label="Blocked attacks"
              value={t?.blocked ?? 0}
              tone="red"
              icon={ShieldAlert}
              suffix="incidents"
              delta={`${blockedRate}%`}
            />
            <BigStatCard
              label="Protocol revenue"
              value={overview?.protocol?.revenue_lifetime_usdc ?? 0}
              format={(n) => n.toFixed(4)}
              tone="purple"
              icon={Wallet}
              suffix="USDC"
              delta={`@ $${overview?.protocol?.fee_per_check_usdc ?? 0}/check`}
              link={
                overview?.protocol?.treasury_address
                  ? {
                      href: `https://testnet.arcscan.app/address/${overview.protocol.treasury_address}`,
                      label: "view treasury on arc",
                    }
                  : undefined
              }
            />
          </section>

          {/* ==== SECTION DIVIDER ==== */}
          <SectionLabel
            title="Live throughput · network activity"
            subtitle="Every bar below is a real Circle Nanopayment settled on Arc Testnet."
          />

          {/* ==== CHART + ROSTER ==== */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <ThroughputChart count={t?.total ?? 0} />
            <AgentRoster
              stats={overview?.per_agent ?? []}
              paused={paused}
              operatorWallet={OPERATOR}
              onPausedChange={(agentId, p) =>
                setPaused((prev) => ({ ...prev, [agentId]: p }))
              }
            />
          </section>

          {/* ==== SECTION DIVIDER ==== */}
          <SectionLabel
            title="Transactions · live feed and incident history"
            subtitle="Click any row to inspect the full 5-layer governance trace."
          />

          {/* ==== FEED + INCIDENTS ==== */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <AgentFeed rows={rows} onSelect={setSelectedPayment} />
            <div className="overflow-hidden rounded-xl border border-white/70 bg-bg-panel shadow-card">
              <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-red-50/60 to-rose-50/60 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-gradient-to-br from-red-100 to-red-200">
                    <ShieldAlert
                      className="h-3.5 w-3.5 text-accent-red"
                      strokeWidth={2.4}
                    />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      Live incidents
                    </div>
                    <div className="font-display text-[13px] font-semibold text-primary">
                      {incidents.length} in the last hour
                    </div>
                  </div>
                </div>
                <a
                  href="/incidents"
                  className="rounded-md border border-line bg-white px-2.5 py-1 font-mono text-[10px] text-muted transition hover:border-accent-blue/40 hover:text-accent-blue"
                >
                  history →
                </a>
              </div>
              <div className="max-h-[480px] space-y-2.5 overflow-auto scrollbar-thin p-3">
                {incidents.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
                      <ShieldCheck className="h-5 w-5 text-accent-green" />
                    </div>
                    <p className="text-sm font-medium text-primary">Rail is clean</p>
                    <p className="font-mono text-[11px] text-muted">
                      no incidents in the last hour
                    </p>
                  </div>
                ) : (
                  incidents
                    .slice(0, 6)
                    .map((inc) => (
                      <IncidentCard
                        key={inc.incident_id}
                        incident={inc}
                        flash={inc.incident_id === flashIncidentId}
                      />
                    ))
                )}
              </div>
            </div>
          </section>
        </div>

        <PaymentDetailModal
          row={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      </main>
    </AppShell>
  );
}

function SectionLabel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 mt-6 flex items-baseline gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line-strong to-line-strong" />
      <div>
        <div className="font-display text-[13px] font-semibold text-primary">
          {title}
        </div>
        <div className="text-[11px] text-muted">{subtitle}</div>
      </div>
      <div className="h-px flex-[3] bg-gradient-to-l from-transparent via-line-strong to-line-strong" />
    </div>
  );
}
