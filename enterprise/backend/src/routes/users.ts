import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";

const router = Router();
router.use(authenticate);

// Membri dell'organizzazione corrente, con ruolo assegnato.
router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { user: true, role: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(
      memberships.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarColor: m.user.avatarColor,
        role: { id: m.role.id, name: m.role.name },
      })),
    );
  } catch (err) {
    next(err);
  }
});

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  roleId: z.string(),
});

// Invito diretto (senza flusso email, adatto a un team piccolo/enterprise interno).
router.post("/", requirePermission("roles", "MANAGE"), async (req: AuthRequest, res, next) => {
  try {
    const body = inviteSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    const user =
      existing ??
      (await prisma.user.create({
        data: { email: body.email, firstName: body.firstName, lastName: body.lastName, passwordHash },
      }));

    const membership = await prisma.membership.create({
      data: { organizationId: req.auth!.organizationId, userId: user.id, roleId: body.roleId },
    });

    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "user.invited",
      entityType: "User",
      entityId: user.id,
    });

    res.status(201).json({ membershipId: membership.id, userId: user.id });
  } catch (err) {
    next(err);
  }
});

const updateRoleSchema = z.object({ roleId: z.string() });

router.patch("/:membershipId/role", requirePermission("roles", "MANAGE"), async (req: AuthRequest, res, next) => {
  try {
    const body = updateRoleSchema.parse(req.body);
    const membership = await prisma.membership.update({
      where: { id: req.params.membershipId },
      data: { roleId: body.roleId },
    });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "user.role_changed",
      entityType: "Membership",
      entityId: membership.id,
      metadata: { roleId: body.roleId },
    });
    res.json(membership);
  } catch (err) {
    next(err);
  }
});

router.delete("/:membershipId", requirePermission("roles", "MANAGE"), async (req: AuthRequest, res, next) => {
  try {
    await prisma.membership.delete({ where: { id: req.params.membershipId } });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "user.removed",
      entityType: "Membership",
      entityId: req.params.membershipId,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
