import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authenticate);

// Cronometro attivo dell'utente corrente (se presente).
router.get("/running", requirePermission("time_entries", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const running = await prisma.timeEntry.findFirst({
      where: { userId: req.auth!.userId, organizationId: req.auth!.organizationId, endedAt: null },
      include: { task: true, project: true },
    });
    res.json(running);
  } catch (err) {
    next(err);
  }
});

router.get("/", requirePermission("time_entries", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { task: true, project: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: { startedAt: "desc" },
      take: 200,
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

const startSchema = z.object({
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  note: z.string().optional(),
});

// Avvia un nuovo cronometro (chiude automaticamente uno eventualmente aperto).
router.post("/start", requirePermission("time_entries", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = startSchema.parse(req.body);
    await prisma.$transaction(async (tx) => {
      const running = await tx.timeEntry.findFirst({
        where: { userId: req.auth!.userId, endedAt: null },
      });
      if (running) {
        const durationSec = Math.round((Date.now() - running.startedAt.getTime()) / 1000);
        await tx.timeEntry.update({
          where: { id: running.id },
          data: { endedAt: new Date(), durationSec },
        });
      }
      await tx.timeEntry.create({
        data: {
          organizationId: req.auth!.organizationId,
          userId: req.auth!.userId,
          projectId: body.projectId,
          taskId: body.taskId,
          note: body.note,
          startedAt: new Date(),
        },
      });
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/stop", requirePermission("time_entries", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const running = await prisma.timeEntry.findFirst({
      where: { userId: req.auth!.userId, endedAt: null },
    });
    if (!running) throw new HttpError(400, "Nessun cronometro attivo");
    const durationSec = Math.round((Date.now() - running.startedAt.getTime()) / 1000);
    const entry = await prisma.timeEntry.update({
      where: { id: running.id },
      data: { endedAt: new Date(), durationSec },
    });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// Registrazione manuale (senza cronometro): utile per inserire ore a posteriori.
const manualSchema = z.object({
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  note: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  billable: z.boolean().optional(),
});

router.post("/manual", requirePermission("time_entries", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = manualSchema.parse(req.body);
    const startedAt = new Date(body.startedAt);
    const endedAt = new Date(body.endedAt);
    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: req.auth!.organizationId,
        userId: req.auth!.userId,
        projectId: body.projectId,
        taskId: body.taskId,
        note: body.note,
        startedAt,
        endedAt,
        durationSec: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
        billable: body.billable ?? true,
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

export default router;
