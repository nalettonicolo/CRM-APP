import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { parsePagination } from "../utils/queryInput.js";

const router = Router();
router.use(authenticate);

// Audit trail in sola lettura — modulo enterprise per compliance/sicurezza.
router.get("/", requirePermission("audit_logs", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const { page, limit } = req.query;
    const { take, skip, page: pageNum } = parsePagination(page, limit);

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { organizationId: req.auth!.organizationId },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.auditLog.count({ where: { organizationId: req.auth!.organizationId } }),
    ]);

    res.json({ items, total, page: pageNum, limit: take });
  } catch (err) {
    next(err);
  }
});

export default router;
