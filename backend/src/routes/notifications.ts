import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/read", async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: paramId(req), userId: req.user!.userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
