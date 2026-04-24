import { Router } from "express";
import { logger } from "../logger.js";
import { runPipeline } from "../services/pipeline.js";
import { PaymentRequestSchema } from "../types.js";

export const payRouter = Router();

payRouter.post("/v1/pay", async (req, res) => {
  const parsed = PaymentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      detail: parsed.error.flatten(),
    });
  }
  try {
    const receipt = await runPipeline(parsed.data);
    return res.json(receipt);
  } catch (err) {
    logger.error({ err }, "pipeline error");
    return res.status(500).json({ error: "pipeline_error", detail: (err as Error).message });
  }
});
