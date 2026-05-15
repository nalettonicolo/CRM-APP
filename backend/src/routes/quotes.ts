import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { calculateQuoteTotals, toDecimal } from "../services/quoteCalculator.js";
import { logActivity } from "../services/activityLog.js";
import { NotFoundError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quote.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `PRV-${year}-${String(count + 1).padStart(4, "0")}`;
}

router.get("/", requirePermission("quotes", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const { status, clientId, page = "1", limit = "20" } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, companyName: true, contactName: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.quote.count({ where }),
    ]);
    res.json({ data: quotes, total });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("quotes", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: paramId(req) },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!quote) throw new NotFoundError();
    if (
      req.user!.role === "CLIENT" &&
      quote.clientId !== req.user!.clientId
    ) {
      throw new NotFoundError();
    }
    res.json(quote);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("quotes", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .object({
        clientId: z.string(),
        title: z.string().optional(),
        category: z.string().optional(),
        validUntil: z.string().datetime().optional(),
        notes: z.string().optional(),
        discountPercent: z.number().optional(),
        discountAmount: z.number().optional(),
        depositPercent: z.number().optional(),
        depositAmount: z.number().optional(),
        items: z
          .array(
            z.object({
              type: z.enum(["service", "product", "custom"]),
              description: z.string(),
              quantity: z.number(),
              unitPrice: z.number(),
              vatRate: z.number().optional(),
              discount: z.number().optional(),
              serviceId: z.string().optional(),
              productId: z.string().optional(),
            })
          )
          .optional(),
      })
      .parse(req.body);

    let items = body.items || [];
    if (body.category) {
      const rule = await prisma.quoteAutomationRule.findFirst({
        where: { category: body.category, isActive: true },
      });
      if (rule?.autoItems && Array.isArray(rule.autoItems)) {
        items = [...items, ...(rule.autoItems as typeof items)];
      }
    }

    const totals = calculateQuoteTotals(
      items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
        discount: i.discount,
      })),
      {
        discountPercent: body.discountPercent,
        discountAmount: body.discountAmount,
        depositPercent: body.depositPercent,
        depositAmount: body.depositAmount,
      }
    );

    const number = await generateQuoteNumber();
    const quote = await prisma.quote.create({
      data: {
        number,
        clientId: body.clientId,
        createdById: req.user!.userId,
        title: body.title,
        category: body.category,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        notes: body.notes,
        discountPercent: toDecimal(body.discountPercent || 0),
        discountAmount: toDecimal(body.discountAmount || 0),
        depositPercent: toDecimal(body.depositPercent || 0),
        depositAmount: toDecimal(totals.total * ((body.depositPercent || 0) / 100) || body.depositAmount || 0),
        subtotal: toDecimal(totals.subtotal),
        vatAmount: toDecimal(totals.vatAmount),
        total: toDecimal(totals.total),
        balanceDue: toDecimal(totals.balanceDue),
        items: {
          create: items.map((item, idx) => ({
            type: item.type,
            description: item.description,
            quantity: toDecimal(item.quantity),
            unitPrice: toDecimal(item.unitPrice),
            vatRate: toDecimal(item.vatRate ?? 22),
            discount: toDecimal(item.discount ?? 0),
            total: toDecimal(
              item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
            ),
            serviceId: item.serviceId,
            productId: item.productId,
            sortOrder: idx,
          })),
        },
      },
      include: { items: true, client: true },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId: body.clientId,
      action: "CREATE",
      entityType: "quote",
      entityId: quote.id,
    });

    res.status(201).json(quote);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("quotes", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        status: z
          .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"])
          .optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
        signedByClient: z.boolean().optional(),
      })
      .parse(req.body);

    const quote = await prisma.quote.update({
      where: { id: paramId(req) },
      data: {
        ...data,
        ...(data.status === "SENT" && { sentAt: new Date() }),
        ...(data.status === "ACCEPTED" && { acceptedAt: new Date() }),
        ...(data.signedByClient && { signedAt: new Date() }),
      },
    });
    res.json(quote);
  } catch (e) {
    next(e);
  }
});

export default router;
