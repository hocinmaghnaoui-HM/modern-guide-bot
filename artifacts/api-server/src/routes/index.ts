import { Router, type IRouter } from "express";
import healthRouter from "./health";
import statsRouter from "./stats";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/stats", statsRouter);
router.use("/auth", authRouter);

export default router;
