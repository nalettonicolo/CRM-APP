import { Router } from "express";
import {
  authenticate,
  adminOnly,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { runDatabaseBackup } from "../services/backup.js";
import { logActivity } from "../services/activityLog.js";

const router = Router();
router.use(authenticate, adminOnly, requirePermission("backup", "CREATE"));

router.post("/trigger", async (req: AuthRequest, res, next) => {
  try {
    const result = await runDatabaseBackup();

    await logActivity({
      userId: req.user!.userId,
      action: "EXPORT",
      entityType: "backup",
      details: { file: result.file },
    });

    res.json({ success: true, file: result.file });
  } catch (e) {
    next(e);
  }
});

export default router;
