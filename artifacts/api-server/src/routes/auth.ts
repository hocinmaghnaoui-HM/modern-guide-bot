import { Router } from "express";

const router = Router();

router.post("/verify", (req, res): void => {
  const { password } = req.body as { password?: string };
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    res.status(500).json({ error: "DASHBOARD_PASSWORD not configured" });
    return;
  }

  if (!password || password !== expected) {
    res.status(401).json({ valid: false, error: "كلمة مرور خاطئة" });
    return;
  }

  res.json({ valid: true });
});

export default router;
