import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { PRIVACY_POLICY_VERSION } from "../constants/privacy.js";
import { prunePrivacyData } from "../services/privacyRetention.js";
import { config } from "../config/index.js";

const router = Router();

router.get("/version", (_req, res) => {
  res.json({
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    leadRetentionDays: config.privacy.leadRetentionDays,
    activityLogRetentionDays: config.privacy.activityLogRetentionDays,
  });
});

router.use(authenticate, adminOnly);

router.post("/maintenance", async (_req, res, next) => {
  try {
    const result = await prunePrivacyData();
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
});

export default router;
