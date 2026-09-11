import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { logAudit } from "../lib/auditLog.js";
import { runAutomationsForTrigger } from "../lib/automationEngine.js";

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  projectId: z.string(),
  columnId: z.string(),
  parentTaskId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional(),
  estimateMin: z.number().int().positive().optional(),
  assigneeId: z.string().optional(),
});

router.post("/", requirePermission("tasks", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = taskSchema.parse(req.body);
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, organizationId: req.auth!.organizationId },
    });
    if (!project) throw new HttpError(404, "Progetto non trovato");

    const lastOrder = await prisma.task.count({ where: { columnId: body.columnId } });

    const task = await prisma.task.create({
      data: {
        projectId: body.projectId,
        columnId: body.columnId,
        parentTaskId: body.parentTaskId,
        title: body.title,
        description: body.description,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        estimateMin: body.estimateMin,
        assigneeId: body.assigneeId,
        creatorId: req.auth!.userId,
        order: lastOrder,
      },
    });

    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "task.created",
      entityType: "Task",
      entityId: task.id,
    });
    await runAutomationsForTrigger(req.auth!.organizationId, "task.created", task);

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  estimateMin: z.number().int().positive().nullable().optional(),
});

router.patch("/:id", requirePermission("tasks", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, project: { organizationId: req.auth!.organizationId } },
    });
    if (!existing) throw new HttpError(404, "Task non trovato");

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...body,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    if (body.status && body.status !== existing.status) {
      await runAutomationsForTrigger(req.auth!.organizationId, "task.status_changed", task);
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Spostamento Kanban: cambia colonna e riordina all'interno della colonna destinazione.
const moveSchema = z.object({ columnId: z.string(), order: z.number().int().min(0) });

router.post("/:id/move", requirePermission("tasks", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = moveSchema.parse(req.body);
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, project: { organizationId: req.auth!.organizationId } },
    });
    if (!task) throw new HttpError(404, "Task non trovato");

    const column = await prisma.boardColumn.findUnique({ where: { id: body.columnId } });
    if (!column) throw new HttpError(404, "Colonna non trovata");

    await prisma.$transaction(async (tx) => {
      // fa spazio nella colonna destinazione
      await tx.task.updateMany({
        where: { columnId: body.columnId, order: { gte: body.order } },
        data: { order: { increment: 1 } },
      });
      await tx.task.update({
        where: { id: task.id },
        data: {
          columnId: body.columnId,
          order: body.order,
          status: column.isDoneColumn ? "DONE" : task.status === "DONE" ? "IN_PROGRESS" : task.status,
        },
      });
    });

    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "task.moved",
      entityType: "Task",
      entityId: task.id,
      metadata: { columnId: body.columnId },
    });
    if (column.isDoneColumn) {
      await runAutomationsForTrigger(req.auth!.organizationId, "task.status_changed", { ...task, status: "DONE" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("tasks", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, project: { organizationId: req.auth!.organizationId } },
    });
    if (!task) throw new HttpError(404, "Task non trovato");
    await prisma.task.delete({ where: { id: task.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Checklist (sotto-elementi di completamento rapido dentro un task)
const checklistSchema = z.object({ label: z.string().min(1) });

router.post("/:id/checklist", requirePermission("tasks", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = checklistSchema.parse(req.body);
    const count = await prisma.checklistItem.count({ where: { taskId: req.params.id } });
    const item = await prisma.checklistItem.create({
      data: { taskId: req.params.id, label: body.label, order: count },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.patch("/checklist/:itemId", requirePermission("tasks", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ done: z.boolean() }).parse(req.body);
    const item = await prisma.checklistItem.update({
      where: { id: req.params.itemId },
      data: { done: body.done },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

export default router;
