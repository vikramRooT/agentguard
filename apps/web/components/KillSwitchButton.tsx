"use client";

import { useState } from "react";
import { Pause, Play, Loader2 } from "lucide-react";
import { pauseAgent, unpauseAgent } from "@/lib/api";
import clsx from "clsx";

interface Props {
  agentId: string;
  paused: boolean;
  operatorWallet: string;
  onChange?: (paused: boolean) => void;
}

export function KillSwitchButton({ agentId, paused, operatorWallet, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      if (paused) {
        await unpauseAgent(agentId);
        onChange?.(false);
      } else {
        await pauseAgent(agentId, operatorWallet, "operator kill switch");
        onChange?.(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : paused ? Play : Pause;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={busy}
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
          "disabled:cursor-not-allowed disabled:opacity-60",
          paused
            ? "border-accent-green/40 bg-accent-green/10 text-accent-green hover:bg-accent-green/20"
            : "border-accent-red/50 bg-accent-red/10 text-accent-red hover:bg-accent-red/20",
        )}
      >
        <Icon className={clsx("h-4 w-4", busy && "animate-spin")} />
        {busy ? "working…" : paused ? "Resume agent" : "Kill switch"}
      </button>
      {error && (
        <span className="max-w-[240px] truncate font-mono text-[10px] text-accent-red/80">
          {error}
        </span>
      )}
    </div>
  );
}
