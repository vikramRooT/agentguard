"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Clock,
  User,
  Coins,
  Hash,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import type { PaymentRow } from "@/lib/api";

interface Props {
  row: PaymentRow | null;
  onClose: () => void;
}

const decisionIcon = {
  approved: { Icon: CheckCircle2, color: "text-accent-green", bg: "bg-accent-green/10", border: "border-accent-green/40" },
  blocked: { Icon: XCircle, color: "text-accent-red", bg: "bg-accent-red/10", border: "border-accent-red/40" },
  escalated: { Icon: AlertTriangle, color: "text-accent-yellow", bg: "bg-accent-yellow/10", border: "border-accent-yellow/40" },
} as const;

export function PaymentDetailModal({ row, onClose }: Props) {
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6 pt-[5vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-bg-panel shadow-glow-strong"
          >
            <ModalContent row={row} onClose={onClose} explorer={explorer} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalContent({
  row,
  onClose,
  explorer,
}: {
  row: PaymentRow;
  onClose: () => void;
  explorer: string;
}) {
  const { Icon, color, bg, border } = decisionIcon[row.decision];

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-line bg-gradient-to-r from-bg-panel to-bg-elevated p-5">
        <div className="flex items-start gap-3">
          <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg border", bg, border)}>
            <Icon className={clsx("h-5 w-5", color)} />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Payment trace
            </div>
            <div className="mt-0.5 font-mono text-sm text-secondary">
              {row.request_id.slice(0, 8)}…{row.request_id.slice(-4)}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-line/60 bg-bg-soft p-1.5 text-muted transition hover:border-line-strong hover:text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Payer / Recipient flow */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line p-5">
        <Party label="from" value={row.agent_id} />
        <ArrowRight className="h-4 w-4 text-subtle" />
        <Party
          label="to"
          value={row.to_agent_id ?? row.to_wallet_address ?? "(external)"}
          align="right"
        />
      </div>

      {/* Core facts */}
      <div className="grid grid-cols-3 gap-px border-b border-line bg-line">
        <Fact
          icon={Coins}
          label="Amount"
          value={`${row.amount_usdc.toFixed(6)} USDC`}
        />
        <Fact
          icon={Clock}
          label="Latency"
          value={`${row.latency_ms.toFixed(0)}ms`}
        />
        <Fact
          icon={Hash}
          label="Decision"
          value={row.decision}
          valueClass={color}
        />
      </div>

      {/* Reason */}
      <div className="border-b border-line p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <FileText className="h-3 w-3" />
          Reason
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-secondary">{row.reason}</p>
      </div>

      {/* On-chain links */}
      {(row.arc_tx_hash || row.audit_tx_hash) && (
        <div className="space-y-2 p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted">
            On-chain
          </div>
          {row.arc_tx_hash && (
            <TxLink
              label="Settlement tx"
              hash={row.arc_tx_hash}
              href={`${explorer}/tx/${row.arc_tx_hash}`}
            />
          )}
          {row.audit_tx_hash && (
            <TxLink
              label="Audit receipt"
              hash={row.audit_tx_hash}
              href={`${explorer}/tx/${row.audit_tx_hash}`}
            />
          )}
        </div>
      )}
    </>
  );
}

function Party({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align?: "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
        {align !== "right" && <User className="h-3 w-3" />}
        {label}
        {align === "right" && <User className="h-3 w-3" />}
      </div>
      <div className="mt-1 truncate font-mono text-sm text-primary">{value}</div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-bg-panel p-4">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={clsx("mt-1 font-mono text-sm tabular-nums", valueClass ?? "text-primary")}>
        {value}
      </div>
    </div>
  );
}

function TxLink({ label, hash, href }: { label: string; hash: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center justify-between rounded-lg border border-line bg-bg-soft px-3 py-2 transition hover:border-accent-blue/50"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-xs text-secondary group-hover:text-accent-blue">
          {hash.slice(0, 20)}…{hash.slice(-8)}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-subtle group-hover:text-accent-blue" />
    </a>
  );
}
