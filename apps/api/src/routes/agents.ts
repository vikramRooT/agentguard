import { Router } from "express";
import { z } from "zod";
import { getAgent, upsertAgent } from "../db/repo.js";

export const agentsRouter = Router();

const RegisterSchema = z.object({
  policy: z.record(z.unknown()).optional(),
  circle_wallet_id: z.string().optional(),
  owner_wallet_id: z.string().optional(),
  erc8004_identity: z.string().optional(),
});

agentsRouter.post("/v1/agents/:agent_id", async (req, res) => {
  const { agent_id } = req.params;
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", detail: parsed.error.flatten() });
  }
  try {
    const agent = await upsertAgent(agent_id, {
      policy: parsed.data.policy ?? {},
      circle_wallet_id: parsed.data.circle_wallet_id,
      owner_wallet_id: parsed.data.owner_wallet_id,
      erc8004_identity: parsed.data.erc8004_identity,
    });
    return res.json({ ok: true, agent });
  } catch (err) {
    return res.status(500).json({ error: "db_error", detail: (err as Error).message });
  }
});

agentsRouter.get("/v1/agents/:agent_id", async (req, res) => {
  const agent = await getAgent(req.params.agent_id);
  if (!agent) return res.status(404).json({ error: "not_found" });
  return res.json(agent);
});

agentsRouter.put("/v1/agents/:agent_id/policy", async (req, res) => {
  const { agent_id } = req.params;
  const body = req.body as { policy?: Record<string, unknown> };
  const policy = body?.policy ?? {};
  try {
    const agent = await upsertAgent(agent_id, { policy });
    return res.json({ ok: true, agent });
  } catch (err) {
    return res.status(500).json({ error: "db_error", detail: (err as Error).message });
  }
});
