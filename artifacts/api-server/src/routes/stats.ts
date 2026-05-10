import { Router } from "express";
import { getStats } from "../bot/services/stats";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
