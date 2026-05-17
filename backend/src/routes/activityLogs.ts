import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, staffOnly } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, staffOnly);

router.get("/", async (req, res, next) => {
  try {
    const {
      clientId,
      userId,
      entityType,
      page = "1",
      limit = "50",
    } = req.query;

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const [data, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          client: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              email: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ data, total, page: pageNum, limit: take });
  } catch (e) {
    next(e);
  }
});

export default router;
