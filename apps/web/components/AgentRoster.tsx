"use client";

import { Users } from "lucide-react";
import { Avatar } from "./Avatar";

interface AgentStat {
  agent_id: string;
  count: number;
  volume_usdc: number;
}

const ROLES: Record<string, { short: string; role: string }> = {
  "research-agent-v1": { short: "Research Agent", role: "Weekly briefings" },
  "data-vendor-agent-v1": { short: "Data Vendor", role: "Sub-cent reports" },
  "sms-agent-v1": { short: "SMS Agent", role: "Twilio notifications" },
  "inference-agent-v1": { short: "Inference Agent", role: "AI inference" },
  "compromised-agent-v1": { short: "Compromised", role: "Attack demo only" },
  "agentguard-treasury": { short: "Treasury", role: "Fees + audit receipts" },
};

export function AgentRoster({ stats }: { stats: AgentStat[] }) {
  const ids = Object.keys(ROLES);
  const byId = new Map(stats.map((s) => [s.agent_id, s]));
  const activeCount = ids.filter((id) => (byId.get(id)?.count ?? 0) > 0).length;

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
              <span className="text-subtle">/{ids.length}</span> active agents
            </div>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {ids.map((id) => {
          const meta = ROLES[id];
          const row = byId.get(id);
          const active = (row?.count ?? 0) > 0;
          return (
            <li
              key={id}
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-bg-soft/60"
            >
              <Avatar seed={id} label={meta.short} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-primary">
                    {meta.short}
                  </span>
                  {active && (
                    <span className="flex h-1.5 w-1.5 items-center">
                      <span className="live-dot" />
                    </span>
                  )}
                </div>
                <div className="truncate text-[11px] text-muted">{meta.role}</div>
              </div>
              <div className="text-right">
                <div
                  className={
                    active
                      ? "font-display text-[15px] font-bold tabular-nums text-primary"
                      : "font-display text-[15px] font-bold tabular-nums text-subtle"
                  }
                >
                  {(row?.count ?? 0).toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-subtle tabular-nums">
                  {(row?.volume_usdc ?? 0).toFixed(4)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
