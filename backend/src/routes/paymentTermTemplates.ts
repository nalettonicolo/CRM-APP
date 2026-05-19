import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { NotFoundError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";
import { toDecimal } from "../services/quoteCalculator.js";

const router = Router();
router.use(authenticate);

const itemSchema = z.object({
  label: z.string().min(1),
  note: z.string().optional().nullable(),
  percent: z.number().min(0).max(100).optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  isBalance: z.boolean().optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const templateSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  items: z.array(itemSchema).min(1),
});

router.get("/", requirePermission("settings", "READ"), async (_req, res, next) => {
  try {
    const templates = await prisma.paymentTermTemplate.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    res.json(templates);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("settings", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = templateSchema.parse(req.body);

    if (data.isDefault) {
      await prisma.paymentTermTemplate.updateMany({
        data: { isDefault: false },
      });
    }

    const template = await prisma.paymentTermTemplate.create({
      data: {
        name: data.name,
        isDefault: data.isDefault ?? false,
        items: {
          create: data.items.map((item, idx) => ({
            label: item.label,
            note: item.note || undefined,
            percent:
              item.percent != null ? toDecimal(item.percent) : undefined,
            amount: item.amount != null ? toDecimal(item.amount) : undefined,
            isBalance: item.isBalance === true,
            sortOrder: idx,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    res.status(201).json(template);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("settings", "UPDATE"), async (req, res, next) => {
  try {
    const data = templateSchema.partial().parse(req.body);
    const id = paramId(req);

    const existing = await prisma.paymentTermTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();

    if (data.isDefault) {
      await prisma.paymentTermTemplate.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    if (data.items) {
      await prisma.paymentTermTemplateItem.deleteMany({ where: { templateId: id } });
    }

    const template = await prisma.paymentTermTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.items && {
          items: {
            create: data.items.map((item, idx) => ({
              label: item.label,
              note: item.note || undefined,
              percent:
                item.percent != null ? toDecimal(item.percent) : undefined,
              amount: item.amount != null ? toDecimal(item.amount) : undefined,
              isBalance: item.isBalance === true,
              sortOrder: idx,
            })),
          },
        }),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    res.json(template);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("settings", "DELETE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    await prisma.paymentTermTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;

export const paymentTermInputSchema = itemSchema;
