import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { logAudit } from "../lib/auditLog.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { permissions: true, _count: { select: { memberships: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(roles);
  } catch (err) {
    next(err);
  }
});

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.array(z.object({ module: z.string(), action: z.enum(["READ", "WRITE", "DELETE", "MANAGE"]) })),
});

// Ruolo custom enterprise: matrice permessi granulare per modulo+azione.
router.post("/", requirePermission("roles", "MANAGE"), async (req: AuthRequest, res, next) => {
  try {
    const body = roleSchema.parse(req.body);
    const role = await prisma.role.create({
      data: {
        organizationId: req.auth!.organizationId,
        name: body.name,
        description: body.description,
        permissions: { create: body.permissions },
      },
      include: { permissions: true },
    });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "role.created",
      entityType: "Role",
      entityId: role.id,
    });
    res.status(201).json(role);
  } catch (err) {
    next(err);
  }
});

router.put("/:id/permissions", requirePermission("roles", "MANAGE"), async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .array(z.object({ module: z.string(), action: z.enum(["READ", "WRITE", "DELETE", "MANAGE"]) }))
      .parse(req.body);

    const role = await prisma.role.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!role) throw new HttpError(404, "Ruolo non trovato");
    if (role.isSystem && role.name === "Owner") {
      throw new HttpError(400, "Il ruolo Owner non è modificabile");
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({ data: body.map((p) => ({ ...p, roleId: role.id })) }),
    ]);

    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "role.permissions_updated",
      entityType: "Role",
      entityId: role.id,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("roles", "MANAGE"), async (req: AuthRequest, res, next) => {
  try {
    const role = await prisma.role.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!role) throw new HttpError(404, "Ruolo non trovato");
    if (role.isSystem) throw new HttpError(400, "I ruoli di sistema non sono eliminabili");

    await prisma.role.delete({ where: { id: role.id } });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "role.deleted",
      entityType: "Role",
      entityId: role.id,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
