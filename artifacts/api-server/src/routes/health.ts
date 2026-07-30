import { Router, type IRouter } from "express";
import { checkDatabaseConnection } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    await checkDatabaseConnection();
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    logger.error({ err: error }, "Database health check failed");
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

export default router;
