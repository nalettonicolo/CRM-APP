import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { toDecimal } from "../services/quoteCalculator.js";
import { NotFoundError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

const ruleSchema = z.object({
  name: z.string(),
  category: z.string(),
  isActive: z.boolean().optional(),
  discountPercent: z.number().optional(),
  discountAmount: z.number().optional(),
  vatRate: z.number().optional(),
  autoItems: z.any().optional(),
  conditions: z.any().optional(),
});

router.get("/", requirePermission("automation", "READ"), async (_req, res, next) => {
  try {
    const rules = await prisma.quoteAutomationRule.findMany({
      orderBy: { name: "asc" },
    });
    res.json(rules);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("automation", "READ"), async (req, res, next) => {
  try {
    const rule = await prisma.quoteAutomationRule.findUnique({
      where: { id: paramId(req) },
    });
    if (!rule) throw new NotFoundError();
    res.json(rule);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("automation", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = ruleSchema.parse(req.body);
    const rule = await prisma.quoteAutomationRule.create({
      data: {
        name: data.name,
        category: data.category,
        isActive: data.isActive ?? true,
        discountPercent:
          data.discountPercent != null
            ? toDecimal(data.discountPercent)
            : undefined,
        discountAmount:
          data.discountAmount != null
            ? toDecimal(data.discountAmount)
            : undefined,
        vatRate: data.vatRate != null ? toDecimal(data.vatRate) : undefined,
        autoItems: data.autoItems,
        conditions: data.conditions,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "quote_automation_rule",
      entityId: rule.id,
    });

    res.status(201).json(rule);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("automation", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = ruleSchema.partial().parse(req.body);
    const existing = await prisma.quoteAutomationRule.findUnique({
      where: { id: paramId(req) },
    });
    if (!existing) throw new NotFoundError();

    const rule = await prisma.quoteAutomationRule.update({
      where: { id: paramId(req) },
      data: {
        ...data,
        discountPercent:
          data.discountPercent != null
            ? toDecimal(data.discountPercent)
            : undefined,
        discountAmount:
          data.discountAmount != null
            ? toDecimal(data.discountAmount)
            : undefined,
        vatRate: data.vatRate != null ? toDecimal(data.vatRate) : undefined,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "quote_automation_rule",
      entityId: rule.id,
    });

    res.json(rule);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("automation", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.quoteAutomationRule.findUnique({
      where: { id: paramId(req) },
    });
    if (!existing) throw new NotFoundError();

    await prisma.quoteAutomationRule.delete({ where: { id: paramId(req) } });

    await logActivity({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "quote_automation_rule",
      entityId: paramId(req),
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
