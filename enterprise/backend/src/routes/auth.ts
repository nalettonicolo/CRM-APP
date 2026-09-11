import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logAudit } from "../lib/auditLog.js";
import { HttpError } from "../middleware/errorHandler.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

const router = Router();

// Permessi di default per i 3 ruoli di sistema creati alla registrazione org.
const MODULES = [
  "projects",
  "tasks",
  "time_entries",
  "chat",
  "docs",
  "whiteboards",
  "automations",
  "reports",
  "roles",
  "audit_logs",
];

const registerSchema = z.object({
  organizationName: z.string().min(2),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "org"
  );
}

// Registrazione: crea Organization + Owner + ruoli di sistema (Owner/Admin/Membro).
router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "Email già registrata");

    const baseSlug = slugify(body.organizationName);
    let slug = baseSlug;
    let n = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n++}`;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: body.organizationName, slug },
      });

      const ownerRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: "Owner",
          description: "Accesso completo, bypassa i controlli permesso",
          isSystem: true,
        },
      });
      const adminRole = await tx.role.create({
        data: { organizationId: org.id, name: "Admin", isSystem: true },
      });
      const memberRole = await tx.role.create({
        data: { organizationId: org.id, name: "Membro", isSystem: true },
      });

      await tx.rolePermission.createMany({
        data: MODULES.map((module) => ({ roleId: adminRole.id, module, action: "MANAGE" })),
      });
      await tx.rolePermission.createMany({
        data: MODULES.filter((m) => m !== "roles" && m !== "audit_logs").flatMap((module) => [
          { roleId: memberRole.id, module, action: "READ" },
          { roleId: memberRole.id, module, action: "WRITE" },
        ]),
      });

      // Board Kanban di default per far partire subito un progetto demo.
      const project = await tx.project.create({
        data: {
          organizationId: org.id,
          name: "Primo progetto",
          description: "Progetto demo creato automaticamente",
          columns: {
            create: [
              { name: "Da fare", order: 0 },
              { name: "In corso", order: 1 },
              { name: "Revisione", order: 2 },
              { name: "Fatto", order: 3, isDoneColumn: true },
            ],
          },
        },
      });

      const user = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
        },
      });

      const membership = await tx.membership.create({
        data: { organizationId: org.id, userId: user.id, roleId: ownerRole.id },
      });

      await tx.chatChannel.create({
        data: {
          organizationId: org.id,
          name: "generale",
          members: { create: [{ userId: user.id }] },
        },
      });

      return { org, user, membership, project };
    });

    const accessToken = signAccessToken({
      userId: result.user.id,
      organizationId: result.org.id,
      membershipId: result.membership.id,
    });
    const refreshToken = signRefreshToken(result.user.id);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: result.user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    await logAudit({
      organizationId: result.org.id,
      userId: result.user.id,
      action: "organization.created",
      entityType: "Organization",
      entityId: result.org.id,
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      organization: { id: result.org.id, name: result.org.name, slug: result.org.slug },
      user: { id: result.user.id, email: result.user.email, firstName: result.user.firstName, lastName: result.user.lastName },
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationSlug: z.string().optional(),
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { memberships: { include: { organization: true } } },
    });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new HttpError(401, "Credenziali non valide");
    }

    const membership = body.organizationSlug
      ? user.memberships.find((m) => m.organization.slug === body.organizationSlug)
      : user.memberships[0];
    if (!membership) throw new HttpError(403, "Nessuna organizzazione associata");

    const accessToken = signAccessToken({
      userId: user.id,
      organizationId: membership.organizationId,
      membershipId: membership.id,
    });
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      organization: { id: membership.organizationId, slug: membership.organization.slug, name: membership.organization.name },
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken, organizationId } = z
      .object({ refreshToken: z.string(), organizationId: z.string() })
      .parse(req.body);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new HttpError(401, "Refresh token non valido");
    }
    const payload = verifyRefreshToken(refreshToken);

    const membership = await prisma.membership.findFirst({
      where: { userId: payload.userId, organizationId },
    });
    if (!membership) throw new HttpError(403, "Accesso all'organizzazione non valido");

    const accessToken = signAccessToken({
      userId: payload.userId,
      organizationId,
      membershipId: membership.id,
    });
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

export default router;
