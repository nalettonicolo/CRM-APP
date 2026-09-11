import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { logAudit } from "../lib/auditLog.js";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("projects", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId: req.auth!.organizationId, archivedAt: null },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// Progetto + board completa (colonne e task) per la vista Kanban.
router.get("/:id", requirePermission("projects", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: {
        columns: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              where: { parentTaskId: null },
              orderBy: { order: "asc" },
              include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
                checklistItems: true,
                subtasks: true,
              },
            },
          },
        },
      },
    });
    if (!project) throw new HttpError(404, "Progetto non trovato");
    res.json(project);
  } catch (err) {
    next(err);
  }
});

const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().optional(),
});

router.post("/", requirePermission("projects", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        organizationId: req.auth!.organizationId,
        name: body.name,
        description: body.description,
        color: body.color,
        columns: {
          create: [
            { name: "Da fare", order: 0 },
            { name: "In corso", order: 1 },
            { name: "Revisione", order: 2 },
            { name: "Fatto", order: 3, isDoneColumn: true },
          ],
        },
      },
      include: { columns: true },
    });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "project.created",
      entityType: "Project",
      entityId: project.id,
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requirePermission("projects", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = projectSchema.partial().parse(req.body);
    const project = await prisma.project.updateMany({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      data: body,
    });
    if (project.count === 0) throw new HttpError(404, "Progetto non trovato");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/archive", requirePermission("projects", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    await prisma.project.updateMany({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      data: { archivedAt: new Date() },
    });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "project.archived",
      entityType: "Project",
      entityId: req.params.id,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
