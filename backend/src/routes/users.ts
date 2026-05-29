import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, adminOnly, type AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate, adminOnly);

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "COMMERCIAL",
    "TECHNICIAN",
    "OPERATOR",
    "WAREHOUSE",
    "CLIENT",
  ]),
  clientId: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]).optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        phone: true,
        clientId: true,
        lastLoginAt: true,
        createdAt: true,
        client: { select: { id: true, companyName: true, contactName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const data = userSchema.parse(req.body);
    if (!data.password) throw new ValidationError("Password richiesta");

    const exists = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) throw new ValidationError("Email già registrata");

    const hash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        clientId: data.clientId,
        status: data.status || "ACTIVE",
        createdById: req.user!.userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "user",
      entityId: user.id,
    });

    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req: AuthRequest, res, next) => {
  try {
    const data = userSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.password;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: paramId(req) },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        phone: true,
        clientId: true,
        createdAt: true,
        lastLoginAt: true,
        client: { select: { id: true, companyName: true, contactName: true } },
      },
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    const id = paramId(req);
    if (id === req.user!.userId) {
      throw new ValidationError("Non puoi eliminare il tuo account");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();

    const [quotes, payments, interventions, reports, events] = await Promise.all([
      prisma.quote.count({ where: { createdById: id } }),
      prisma.clientPayment.count({ where: { createdById: id } }),
      prisma.intervention.count({ where: { technicianId: id } }),
      prisma.interventionReport.count({ where: { technicianId: id } }),
      prisma.event.count({ where: { assigneeId: id } }),
    ]);

    if (quotes + payments + interventions + reports + events > 0) {
      throw new ValidationError(
        "Impossibile eliminare: l'utente ha preventivi, pagamenti, interventi, verbali o eventi collegati"
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.userPermission.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    await logActivity({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "user",
      entityId: id,
      details: { email: existing.email },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/reset-password", async (req: AuthRequest, res, next) => {
  try {
    const { password } = z.object({ password: z.string().min(8) }).parse(req.body);
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: paramId(req) },
      data: { passwordHash: hash },
    });
    res.json({ message: "Password reimpostata" });
  } catch (e) {
    next(e);
  }
});

export default router;
