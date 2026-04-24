import { randomUUID } from "node:crypto";
import { logger } from "../logger.js";
import {
  getAgent,
  recordIncident,
  recordPayment,
  upsertAgent,
} from "../db/repo.js";
import type {
  DecisionKind,
  PaymentReceipt,
  PaymentRequest,
  PolicyTrace,
} from "../types.js";
import { evaluatePolicy, type PolicyConfig } from "./policy_engine.js";
import { evaluateAnomaly, trainOnApprovedPayment } from "./anomaly_engine.js";
import { classifyIntent } from "./intent_classifier.js";
import { verifyRecipientIdentity, verifySenderIdentity } from "./erc8004_identity.js";
import { writeAuditNanopayment } from "./arc_audit.js";
import { circle } from "./circle.js";
import { pubsub } from "../pubsub.js";
import { config } from "../config.js";

/**
 * The single governance pipeline.
 *
 * Order of checks matters: killswitch -> identity -> policy -> anomaly -> intent.
 * Cheapest + most deterministic checks run first; the Claude/Gemini call is last
 * and only fires when earlier layers haven't already made a decision.
 */
export async function runPipeline(request: PaymentRequest): Promise<PaymentReceipt> {
  const started = performance.now();
  const request_id = randomUUID();
  const trace: PolicyTrace[] = [];
  const evidence: Record<string, unknown> = {};

  let decision: DecisionKind = "approved";
  let reason = "all checks passed";

  // --------------------------------------------------------------
  // 0) Kill switch
  // --------------------------------------------------------------
  const agent = await safeGetAgent(request.agent_id);
  if (!agent) {
    // Auto-register a minimal record so pipeline works when the SDK hasn't
    // called register first. Policy will be empty -> default-permissive.
    await upsertAgent(request.agent_id, { policy: {} }).catch(() => {});
  }

  const paused = agent?.paused ?? false;
  trace.push({
    layer: "kill_switch",
    passed: !paused,
    reason: paused ? "agent wallet is paused by operator" : "not paused",
    detail: {},
    latency_ms: 0,
  });
  if (paused) {
    decision = "blocked";
    reason = "agent wallet is paused by operator";
    return await finalize(request, request_id, decision, reason, trace, evidence, started);
  }

  // --------------------------------------------------------------
  // 1) ERC-8004 identity
  // --------------------------------------------------------------
  const identityStart = performance.now();
  const senderCheck = await verifySenderIdentity(
    request.agent_id,
    agent?.owner_wallet_id ?? null,
  );
  let recipientWallet: string | null = null;
  if (request.to_agent_id) {
    const recipientAgent = await safeGetAgent(request.to_agent_id);
    recipientWallet = recipientAgent?.owner_wallet_id ?? null;
  }
  const recipientCheck = await verifyRecipientIdentity(
    request.to_agent_id,
    recipientWallet,
  );
  const identityOk = senderCheck.ok && recipientCheck.ok;
  trace.push({
    layer: "identity",
    passed: identityOk,
    reason: identityOk
      ? "ERC-8004 identities verified"
      : `${!senderCheck.ok ? senderCheck.reason : ""} ${!recipientCheck.ok ? recipientCheck.reason : ""}`.trim(),
    detail: { sender: senderCheck, recipient: recipientCheck },
    latency_ms: Number((performance.now() - identityStart).toFixed(2)),
  });
  if (!identityOk) {
    decision = "blocked";
    reason = "ERC-8004 identity verification failed";
    return await finalize(request, request_id, decision, reason, trace, evidence, started);
  }

  // --------------------------------------------------------------
  // 2) Policy
  // --------------------------------------------------------------
  const policy = (agent?.policy ?? {}) as PolicyConfig;
  const policyResult = await evaluatePolicy(request, policy);
  trace.push(policyResult.trace);
  if (policyResult.action === "block") {
    decision = "blocked";
    reason = policyResult.trace.reason;
    return await finalize(request, request_id, decision, reason, trace, evidence, started);
  }
  if (policyResult.action === "require_human_approval") {
    decision = "escalated";
    reason = policyResult.trace.reason;
    return await finalize(request, request_id, decision, reason, trace, evidence, started);
  }

  // --------------------------------------------------------------
  // 3) Anomaly
  // --------------------------------------------------------------
  const anomaly = await evaluateAnomaly({ request, paused });
  trace.push(anomaly.trace);
  if (!anomaly.passed) {
    decision = "escalated";
    reason = anomaly.trace.reason;
    // Anomalies escalate rather than hard-block, so operators can decide.
    // The attack demo will chain this with an explicit policy block when
    // the intent layer also flags malicious.
  }

  // --------------------------------------------------------------
  // 4) Intent (Claude Haiku / Gemini Flash) — only when cheap layers
  //    haven't already produced a decision, OR when the request has a
  //    free-form intent string worth verifying.
  // --------------------------------------------------------------
  const sensitivity = (policy as { intent_verification?: { sensitivity?: string } })
    .intent_verification?.sensitivity;
  const shouldCallClassifier =
    sensitivity === "high" ||
    decision === "escalated" ||
    request.amount_usdc > 1.0 ||
    !anomaly.passed;

  if (shouldCallClassifier) {
    const intent = await classifyIntent(request);
    trace.push(intent.trace);
    evidence.intent_classifier = intent.output;
    if (intent.output.classification === "malicious") {
      decision = "blocked";
      reason = `intent classifier flagged malicious: ${intent.output.reasoning}`;
    } else if (intent.output.classification === "suspicious" && decision === "approved") {
      decision = "escalated";
      reason = `intent classifier flagged suspicious: ${intent.output.reasoning}`;
    }
  }

  // --------------------------------------------------------------
  // Settle if still approved
  // --------------------------------------------------------------
  if (decision === "approved") {
    try {
      // Resolve recipient address. For A2A we use the recipient agent's
      // on-record owner wallet address (already looked up in the identity
      // check above). For external payments the request carries the raw
      // address directly.
      const destinationAddress =
        request.to_wallet_address ?? recipientWallet ?? undefined;
      const settlement = await circle.sendNanopayment({
        from_wallet_id: agent?.circle_wallet_id ?? request.agent_id,
        to_wallet_id: request.to_agent_id ?? undefined,
        to_address: destinationAddress,
        amount_usdc: request.amount_usdc,
        memo: `ag:pay:${request_id.slice(0, 8)}`,
      });
      evidence.settlement = settlement;
      await trainOnApprovedPayment(request);
      return await finalize(
        request,
        request_id,
        "approved",
        "all checks passed — settled",
        trace,
        evidence,
        started,
        settlement.tx_hash,
      );
    } catch (err) {
      logger.error({ err }, "settlement failed");
      decision = "blocked";
      reason = `settlement error: ${(err as Error).message}`;
    }
  }

  return await finalize(request, request_id, decision, reason, trace, evidence, started);
}

async function finalize(
  request: PaymentRequest,
  request_id: string,
  decision: DecisionKind,
  reason: string,
  trace: PolicyTrace[],
  evidence: Record<string, unknown>,
  startedAt: number,
  settlementTxHash?: string,
): Promise<PaymentReceipt> {
  const audit = await writeAuditNanopayment({
    agent_id: request.agent_id,
    request_id,
    decision,
    trace,
    evidence,
  }).catch((err) => {
    logger.warn({ err }, "audit write failed — proceeding without");
    return null;
  });

  const receipt: PaymentReceipt = {
    request_id,
    agent_id: request.agent_id,
    decision,
    approved: decision === "approved",
    amount_usdc: request.amount_usdc,
    to_agent_id: request.to_agent_id,
    to_wallet_address: request.to_wallet_address,
    reason,
    trace,
    arc_tx_hash: settlementTxHash,
    audit_tx_hash: audit?.tx_hash,
    evidence,
    latency_ms: Number((performance.now() - startedAt).toFixed(2)),
    created_at: new Date().toISOString(),
  };

  try {
    await recordPayment(request, receipt);
  } catch (err) {
    logger.debug({ err }, "payment record skipped");
  }

  if (decision !== "approved") {
    try {
      const incident = await recordIncident(
        request_id,
        request.agent_id,
        decision,
        reason,
        trace,
        evidence,
        audit?.tx_hash ?? null,
      );
      pubsub.publish({
        type: "incident.new",
        payload: incident as unknown as Record<string, unknown>,
      });
    } catch (err) {
      logger.debug({ err }, "incident record skipped");
    }
  }

  pubsub.publish({
    type:
      decision === "approved"
        ? "payment.approved"
        : decision === "blocked"
          ? "payment.blocked"
          : "payment.escalated",
    payload: receipt as unknown as Record<string, unknown>,
  });

  return receipt;
}

async function safeGetAgent(agent_id: string) {
  try {
    return await getAgent(agent_id);
  } catch {
    return null;
  }
}

// Re-export for tests/index
export { config };
