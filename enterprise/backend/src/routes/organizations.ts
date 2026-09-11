import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";

const router = Router();
router.use(authenticate);

// Organizzazione corrente (contesto multi-tenant dedotto dal token).
router.get("/current", async (req: AuthRequest, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.auth!.organizationId },
      include: { _count: { select: { projects: true, roles: true, memberships: true } } },
    });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({ name: z.string().min(2).optional() });

router.patch("/current", requirePermission("roles", "MANAGE"), async (req: AuthRequest, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const org = await prisma.organization.update({
      where: { id: req.auth!.organizationId },
      data: body,
    });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "organization.updated",
      entityType: "Organization",
      entityId: org.id,
    });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

export default router;
