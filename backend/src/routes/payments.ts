import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { logActivity } from "../services/activityLog.js";
import { syncQuotePaymentStatus } from "../services/quotePayments.js";
import {
  getClientPaymentOverview,
  getOpenPaymentsOverview,
} from "../services/paymentSchedule.js";

const router = Router();
router.use(authenticate);

const paymentBody = z.object({
  clientId: z.string().min(1),
  quoteId: z.string().optional().nullable(),
  quotePaymentTermId: z.string().optional().nullable(),
  label: z.string().min(1),
  amount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  method: z
    .enum(["BANK_TRANSFER", "CASH", "CARD", "PAYPAL", "OTHER"])
    .optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

router.get("/summary", requirePermission("payments", "READ"), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const where: { paidAt?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = from;
      if (to) where.paidAt.lte = to;
    }

    const [agg, count] = await Promise.all([
      prisma.clientPayment.aggregate({ where, _sum: { amount: true } }),
      prisma.clientPayment.count({ where }),
    ]);

    res.json({
      count,
      totalReceived: Number(agg._sum.amount ?? 0),
    });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/open-overview",
  requirePermission("payments", "READ"),
  async (req, res, next) => {
    try {
      const clientId = req.query.clientId
        ? String(req.query.clientId)
        : undefined;
      const overview = await getOpenPaymentsOverview(clientId);
      res.json(overview);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/client-overview",
  requirePermission("payments", "READ"),
  async (req, res, next) => {
    try {
      const clientId = String(req.query.clientId || "");
      if (!clientId) {
        throw new ValidationError("clientId obbligatorio");
      }
      const overview = await getClientPaymentOverview(clientId);
      res.json(overview);
    } catch (e) {
      next(e);
    }
  }
);

router.get("/", requirePermission("payments", "READ"), async (req, res, next) => {
  try {
    const clientId = req.query.clientId ? String(req.query.clientId) : undefined;
    const quoteId = req.query.quoteId ? String(req.query.quoteId) : undefined;

    const payments = await prisma.clientPayment.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(quoteId ? { quoteId } : {}),
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            firstName: true,
            lastName: true,
          },
        },
        quote: { select: { id: true, number: true, title: true, total: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    res.json(payments);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("payments", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = paymentBody.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new NotFoundError("Cliente non trovato");

    if (data.quoteId) {
      const quote = await prisma.quote.findFirst({
        where: { id: data.quoteId, clientId: data.clientId },
      });
      if (!quote) throw new ValidationError("Preventivo non valido per questo cliente");
    }

    const payment = await prisma.clientPayment.create({
      data: {
        clientId: data.clientId,
        quoteId: data.quoteId || null,
        quotePaymentTermId: data.quotePaymentTermId || null,
        label: data.label,
        amount: data.amount,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        method: data.method || "BANK_TRANSFER",
        reference: data.reference,
        notes: data.notes,
        createdById: req.user!.userId,
      },
      include: {
        client: {
          select: { id: true, companyName: true, contactName: true },
        },
        quote: { select: { id: true, number: true, title: true } },
      },
    });

    if (data.quoteId) await syncQuotePaymentStatus(data.quoteId);

    await logActivity({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "payment",
      entityId: payment.id,
      details: { amount: data.amount, label: data.label },
    });

    res.status(201).json(payment);
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/:id",
  requirePermission("payments", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const id = paramId(req);
      const existing = await prisma.clientPayment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError();

      const data = paymentBody.partial().parse(req.body);
      const payment = await prisma.clientPayment.update({
        where: { id },
        data: {
          ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
          ...(data.quoteId !== undefined ? { quoteId: data.quoteId } : {}),
          ...(data.quotePaymentTermId !== undefined
            ? { quotePaymentTermId: data.quotePaymentTermId }
            : {}),
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.paidAt !== undefined ? { paidAt: new Date(data.paidAt) } : {}),
          ...(data.method !== undefined ? { method: data.method } : {}),
          ...(data.reference !== undefined ? { reference: data.reference } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
        include: {
          client: { select: { id: true, companyName: true, contactName: true } },
          quote: { select: { id: true, number: true, title: true } },
        },
      });

      const quoteIds = new Set(
        [existing.quoteId, payment.quoteId].filter(Boolean) as string[]
      );
      for (const qid of quoteIds) await syncQuotePaymentStatus(qid);

      res.json(payment);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id",
  requirePermission("payments", "DELETE"),
  async (req: AuthRequest, res, next) => {
    try {
      const id = paramId(req);
      const existing = await prisma.clientPayment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError();

      await prisma.clientPayment.delete({ where: { id } });
      if (existing.quoteId) await syncQuotePaymentStatus(existing.quoteId);

      await logActivity({
        userId: req.user!.userId,
        action: "DELETE",
        entityType: "payment",
        entityId: id,
      });

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
