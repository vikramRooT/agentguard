import { Router } from "express";
import { listIncidents } from "../db/repo.js";

export const incidentsRouter = Router();

incidentsRouter.get("/v1/incidents", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 500);
  try {
    const incidents = await listIncidents(limit);
    return res.json({ incidents });
  } catch (err) {
    return res.status(500).json({ error: "db_error", detail: (err as Error).message });
  }
});
