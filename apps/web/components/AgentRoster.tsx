"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Pause, Play, Users } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "./Avatar";
import { pauseAgent, unpauseAgent } from "@/lib/api";

const TREASURY_ADDRESS =
  "0x82af8a89f1121b752781e2e2df9d10e4b985a4ec";
const ARC_EXPLORER = "https://testnet.arcscan.app";

interface AgentStat {
  agent_id: string;
  count: number;
  volume_usdc: number;
}

type RoleKind = "sender" | "receiver-only" | "demo-only";

const ROLES: Record<
  string,
  { short: string; role: string; kind: RoleKind }
> = {
  "research-agent-v1": {
    short: "Research Agent",
    role: "Weekly briefings",
    kind: "sender",
  },
  "data-vendor-agent-v1": {
    short: "Data Vendor",
    role: "Sub-cent reports",
    kind: "sender",
  },
  "sms-agent-v1": {
    short: "SMS Agent",
    role: "Twilio notifications",
    kind: "sender",
  },
  "inference-agent-v1": {
    short: "Inference Agent",
    role: "AI inference",
    kind: "sender",
  },
  "compromised-agent-v1": {
    short: "Compromised",
    role: "Fires only on attack demo",
    kind: "demo-only",
  },
  "agentguard-treasury": {
    short: "Treasury",
    role: "Receives audit fees",
    kind: "receiver-only",
  },
};

interface Props {
  stats: AgentStat[];
  paused: Record<string, boolean>;
  operatorWallet: string;
  onPausedChange: (agentId: string, paused: boolean) => void;
}

export function AgentRoster({ stats, paused, operatorWallet, onPausedChange }: Props) {
  const ids = Object.keys(ROLES);
  const byId = new Map(stats.map((s) => [s.agent_id, s]));
  // "Active" only counts agents that *send* — receivers/demo-only rows
  // don't show payments by design and shouldn't reduce the active fraction.
  const senderIds = ids.filter((id) => ROLES[id].kind === "sender");
  const activeCount = senderIds.filter(
    (id) => (byId.get(id)?.count ?? 0) > 0 && !paused[id],
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg-panel shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100">
            <Users className="h-3.5 w-3.5 text-accent-purple" strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Live economy
            </div>
            <div className="font-display text-[13px] font-semibold text-primary">
              <span className="text-accent-green">{activeCount}</span>
              <span className="text-subtle">/{senderIds.length}</span> active senders
            </div>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {ids.map((id) => {
          const meta = ROLES[id];
          const row = byId.get(id);
          const isPaused = !!paused[id];
          const active = (row?.count ?? 0) > 0 && !isPaused;
          return (
            <li
              key={id}
              className={clsx(
                "flex items-center gap-3 px-5 py-3 transition hover:bg-bg-soft/60",
                isPaused && "bg-red-50/40",
              )}
            >
              <Avatar seed={id} label={meta.short} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-primary">
                    {meta.short}
                  </span>
                  {isPaused ? (
                    <span className="rounded-sm border border-accent-red/30 bg-accent-red/10 px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider text-accent-red">
                      paused
                    </span>
                  ) : meta.kind === "receiver-only" ? (
                    <span className="rounded-sm border border-violet-200 bg-violet-50 px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider text-accent-purple">
                      receiver
                    </span>
                  ) : meta.kind === "demo-only" ? (
                    <span className="rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider text-accent-yellow">
                      demo
                    </span>
                  ) : active ? (
                    <span className="flex h-1.5 w-1.5 items-center">
                      <span className="live-dot" />
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-[11px] text-muted">{meta.role}</div>
              </div>
              <div className="text-right">
                <div
                  className={clsx(
                    "font-display text-[15px] font-bold tabular-nums",
                    active ? "text-primary" : "text-subtle",
                  )}
                >
                  {(row?.count ?? 0).toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-subtle tabular-nums">
                  {(row?.volume_usdc ?? 0).toFixed(4)}
                </div>
              </div>
              {/* Hide kill switch for receiver-only / demo-only rows —
                  pausing them is meaningless. The treasury row instead
                  links to its on-chain address so judges can verify the
                  governance fees on Arc Block Explorer. */}
              {meta.kind === "sender" ? (
                <RowKillSwitch
                  agentId={id}
                  paused={isPaused}
                  operatorWallet={operatorWallet}
                  onChange={(p) => onPausedChange(id, p)}
                />
              ) : id === "agentguard-treasury" ? (
                <a
                  href={`${ARC_EXPLORER}/address/${TREASURY_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  title="View treasury on Arc Block Explorer"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted transition hover:border-accent-purple/40 hover:bg-accent-purple/10 hover:text-accent-purple"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <div className="h-7 w-7" aria-hidden />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RowKillSwitch({
  agentId,
  paused,
  operatorWallet,
  onChange,
}: {
  agentId: string;
  paused: boolean;
  operatorWallet: string;
  onChange: (paused: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      if (paused) {
        await unpauseAgent(agentId);
        onChange(false);
      } else {
        await pauseAgent(agentId, operatorWallet, "operator kill switch");
        onChange(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : paused ? Play : Pause;
  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleClick}
        disabled={busy}
        title={paused ? "Resume agent" : "Pause agent (kill switch)"}
        className={clsx(
          "flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-50",
          paused
            ? "border-accent-green/40 bg-accent-green/10 text-accent-green hover:bg-accent-green/20"
            : "border-line text-muted hover:border-accent-red/40 hover:bg-accent-red/10 hover:text-accent-red",
        )}
      >
        <Icon className={clsx("h-3.5 w-3.5", busy && "animate-spin")} />
      </button>
      {error && (
        <span className="mt-1 max-w-[140px] truncate font-mono text-[9px] text-accent-red/80">
          {error}
        </span>
      )}
    </div>
  );
}
