import { Router } from "express";
import { z } from "zod";
import { getAgent, setAgentPaused } from "../db/repo.js";
import { circle } from "../services/circle.js";
import { pubsub } from "../pubsub.js";
import { logger } from "../logger.js";

export const killSwitchRouter = Router();

const PauseSchema = z.object({
  authorized_by: z.string().min(1),
  signature: z.string().optional(),
  reason: z.string().optional(),
});

killSwitchRouter.post("/v1/kill-switch/:agent_id/pause", async (req, res) => {
  const { agent_id } = req.params;
  const parsed = PauseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", detail: parsed.error.flatten() });
  }

  const agent = await getAgent(agent_id);
  if (!agent) return res.status(404).json({ error: "agent_not_found" });

  // Authorization — the SDK/dashboard passes an authorized wallet; we compare
  // against the policy's authorized_pausers list.
  const policyPausers =
    ((agent.policy as Record<string, unknown>).kill_switch as {
      authorized_pausers?: string[];
    } | undefined)?.authorized_pausers ?? [];
  if (policyPausers.length > 0 && !policyPausers.includes(parsed.data.authorized_by)) {
    return res.status(403).json({
      error: "unauthorized_pauser",
      detail: `${parsed.data.authorized_by} is not in authorized_pausers`,
    });
  }

  let circleResult: Awaited<ReturnType<typeof circle.pauseWallet>> | null = null;
  if (agent.circle_wallet_id) {
    try {
      circleResult = await circle.pauseWallet(agent.circle_wallet_id);
    } catch (err) {
      logger.warn({ err }, "circle pauseWallet failed");
    }
  }

  await setAgentPaused(agent_id, true).catch(() => {});
  pubsub.publish({ type: "agent.paused", payload: { agent_id } });

  return res.json({
    ok: true,
    agent_id,
    paused: true,
    circle_native: circleResult?.supported ?? false,
    detail: circleResult?.detail ?? "API-level pause applied",
    reason: parsed.data.reason,
  });
});

killSwitchRouter.post("/v1/kill-switch/:agent_id/unpause", async (req, res) => {
  const { agent_id } = req.params;
  const agent = await getAgent(agent_id);
  if (!agent) return res.status(404).json({ error: "agent_not_found" });

  if (agent.circle_wallet_id) {
    try {
      await circle.unpauseWallet(agent.circle_wallet_id);
    } catch (err) {
      logger.warn({ err }, "circle unpauseWallet failed");
    }
  }

  await setAgentPaused(agent_id, false).catch(() => {});
  pubsub.publish({ type: "agent.unpaused", payload: { agent_id } });
  return res.json({ ok: true, agent_id, paused: false });
});
