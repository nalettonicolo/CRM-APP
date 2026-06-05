import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, staffOnly } from "../middleware/auth.js";
import { ACTIVITY_ENTITY_TYPES } from "../utils/activityEntityTypes.js";
import {
  optionalEnum,
  optionalId,
  parsePagination,
} from "../utils/queryInput.js";

const router = Router();
router.use(authenticate, staffOnly);

router.get("/", async (req, res, next) => {
  try {
    const { clientId, userId, entityType, page, limit } = req.query;
    const { page: pageNum, take, skip } = parsePagination(page, limit, {
      limit: 50,
    });

    const where: Record<string, unknown> = {};
    const safeClientId = optionalId(clientId);
    const safeUserId = optionalId(userId);
    const safeEntityType = optionalEnum(entityType, ACTIVITY_ENTITY_TYPES);
    if (safeClientId) where.clientId = safeClientId;
    if (safeUserId) where.userId = safeUserId;
    if (safeEntityType) where.entityType = safeEntityType;

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
