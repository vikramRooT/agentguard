import { dailySpendForAgent, perRecipientSpendToday } from "../db/repo.js";
import type { PaymentRequest, PolicyTrace } from "../types.js";

export interface PolicyConfig {
  spending_limits?: {
    per_transaction?: number;
    per_day?: number;
    per_recipient_per_day?: number;
  };
  recipient_policy?: {
    type?: "allowlist" | "denylist" | "open";
    approved_recipients?: string[];
    blocked_recipients?: string[];
    fallback_action?: "block" | "require_human_approval" | "allow";
  };
  category_policy?: {
    allowed?: string[];
    blocked?: string[];
  };
  approval_rules?: Array<{ if: string; then: string }>;
  kill_switch?: {
    enabled?: boolean;
    authorized_pausers?: string[];
  };
}

export interface PolicyEvaluation {
  trace: PolicyTrace;
  passed: boolean;
  action: "allow" | "block" | "require_human_approval";
}

export async function evaluatePolicy(
  request: PaymentRequest,
  policy: PolicyConfig,
): Promise<PolicyEvaluation> {
  const start = performance.now();
  const detail: Record<string, unknown> = {};
  const reasons: string[] = [];
  let action: PolicyEvaluation["action"] = "allow";

  const recipient = request.to_agent_id ?? request.to_wallet_address ?? "";

  // 1) Spending limits
  const limits = policy.spending_limits ?? {};
  if (limits.per_transaction && request.amount_usdc > limits.per_transaction) {
    reasons.push(
      `amount ${request.amount_usdc} exceeds per-transaction limit ${limits.per_transaction}`,
    );
    action = "block";
  }

  if (limits.per_day) {
    const spent = await safeDailySpend(request.agent_id);
    detail.daily_spend_usdc = spent;
    if (spent + request.amount_usdc > limits.per_day) {
      reasons.push(
        `would exceed daily spending cap ${limits.per_day} (already ${spent.toFixed(4)})`,
      );
      action = "block";
    }
  }

  if (limits.per_recipient_per_day && recipient) {
    const spent = await safeRecipientSpend(request.agent_id, recipient);
    detail.recipient_spend_today = spent;
    if (spent + request.amount_usdc > limits.per_recipient_per_day) {
      reasons.push(
        `would exceed per-recipient daily cap ${limits.per_recipient_per_day}`,
      );
      action = "block";
    }
  }

  // 2) Recipient allowlist / denylist
  const recipientPolicy = policy.recipient_policy ?? { type: "open" };
  if (recipientPolicy.type === "allowlist") {
    const approved = recipientPolicy.approved_recipients ?? [];
    if (recipient && !approved.includes(recipient)) {
      const fallback = recipientPolicy.fallback_action ?? "block";
      reasons.push(`recipient ${recipient} not on allowlist`);
      action = fallback === "allow" ? action : fallback;
    }
  } else if (recipientPolicy.type === "denylist") {
    const blocked = recipientPolicy.blocked_recipients ?? [];
    if (blocked.includes(recipient)) {
      reasons.push(`recipient ${recipient} is explicitly blocked`);
      action = "block";
    }
  }

  // 3) Approval rules (simple pattern matching — full DSL is post-hackathon)
  for (const rule of policy.approval_rules ?? []) {
    if (matchSimpleCondition(rule.if, request)) {
      if (rule.then === "require_human_approval" && action !== "block") {
        action = "require_human_approval";
        reasons.push(`approval rule matched: ${rule.if}`);
      } else if (rule.then === "block") {
        action = "block";
        reasons.push(`block rule matched: ${rule.if}`);
      }
    }
  }

  const passed = action === "allow";
  return {
    passed,
    action,
    trace: {
      layer: "policy",
      passed,
      reason: reasons.length === 0 ? "all policy checks passed" : reasons.join("; "),
      detail,
      latency_ms: Number((performance.now() - start).toFixed(2)),
    },
  };
}

function matchSimpleCondition(condition: string, request: PaymentRequest): boolean {
  // Supports: "transaction_amount > N", "new_recipient AND transaction_amount > N"
  // Good enough for hackathon-scope policies; swap for a real expression parser
  // once more conditions are needed.
  const amountMatch = condition.match(/transaction_amount\s*>\s*([0-9.]+)/);
  if (amountMatch) {
    const threshold = Number(amountMatch[1]);
    return request.amount_usdc > threshold;
  }
  return false;
}

async function safeDailySpend(agent_id: string): Promise<number> {
  try {
    return await dailySpendForAgent(agent_id);
  } catch {
    return 0;
  }
}

async function safeRecipientSpend(agent_id: string, recipient: string): Promise<number> {
  try {
    return await perRecipientSpendToday(agent_id, recipient);
  } catch {
    return 0;
  }
}
