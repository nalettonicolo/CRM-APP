import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("automations", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { _count: { select: { runLogs: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

// Trigger e azioni disponibili — usato dal builder visuale nel frontend
// per popolare i menu a tendina senza hardcodare i tipi lato client.
router.get("/catalog", requirePermission("automations", "READ"), async (_req, res) => {
  res.json({
    triggers: [
      { type: "task.created", label: "Quando viene creato un task" },
      { type: "task.status_changed", label: "Quando lo stato di un task cambia" },
    ],
    actions: [
      { type: "task.assign", label: "Assegna il task a un utente", params: ["userId"] },
      { type: "task.move_column", label: "Sposta il task in un'altra colonna", params: ["columnId"] },
      { type: "notification.send", label: "Invia una notifica", params: ["userId", "title"] },
    ],
  });
});

const ruleSchema = z.object({
  name: z.string().min(1),
  triggerType: z.string(),
  triggerConfig: z.record(z.any()).optional(),
  actionType: z.string(),
  actionConfig: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

router.post("/", requirePermission("automations", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = ruleSchema.parse(req.body);
    const rule = await prisma.automationRule.create({
      data: {
        organizationId: req.auth!.organizationId,
        name: body.name,
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig ?? {},
        actionType: body.actionType,
        actionConfig: body.actionConfig ?? {},
        isActive: body.isActive ?? true,
      },
    });
    await logAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "automation.created",
      entityType: "AutomationRule",
      entityId: rule.id,
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requirePermission("automations", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = ruleSchema.partial().parse(req.body);
    await prisma.automationRule.updateMany({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      data: body,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("automations", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    await prisma.automationRule.deleteMany({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
