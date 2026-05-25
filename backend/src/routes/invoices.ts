import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { INVOICE_COURTESY_DISCLAIMER } from "../constants/documentCopy.js";
import { logActivity } from "../services/activityLog.js";
import { generateInvoicePdf } from "../services/invoicePdf.js";
import { loadCompanySettings } from "../services/quotePdf.js";
import { toDecimal } from "../services/quoteCalculator.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

const invoiceUpdateSchema = z.object({
  subtotal: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  depositAmount: z.number().min(0).optional(),
  balanceDue: z.number().min(0).optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID", "OVERDUE"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  disclaimer: z.string().min(1).optional(),
});

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoicePreview.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `FPR-${year}-${String(count + 1).padStart(4, "0")}`;
}

router.get("/", requirePermission("invoices", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const invoices = await prisma.invoicePreview.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        quote: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("invoices", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const where: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const invoice = await prisma.invoicePreview.findFirst({
      where,
      include: {
        client: true,
        quote: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      },
    });
    if (!invoice) throw new NotFoundError();
    res.json(invoice);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("invoices", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const { quoteId } = z.object({ quoteId: z.string() }).parse(req.body);

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { client: true },
    });
    if (!quote) throw new NotFoundError("Preventivo non trovato");
    if (quote.status !== "ACCEPTED") {
      throw new ValidationError(
        "Il preventivo deve essere accettato prima di generare il documento"
      );
    }

    const existing = await prisma.invoicePreview.findFirst({
      where: { quoteId: quote.id },
    });
    if (existing) {
      throw new ValidationError(
        `Esiste già il documento ${existing.number} per questo preventivo`
      );
    }

    const number = await generateInvoiceNumber();
    const invoice = await prisma.invoicePreview.create({
      data: {
        number,
        clientId: quote.clientId,
        quoteId: quote.id,
        subtotal: quote.subtotal,
        vatAmount: quote.vatAmount,
        total: quote.total,
        depositAmount: quote.depositAmount,
        balanceDue: quote.balanceDue,
        paymentStatus: quote.paymentStatus,
        disclaimer: INVOICE_COURTESY_DISCLAIMER,
      },
      include: { client: true, quote: true },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId: quote.clientId,
      action: "CREATE",
      entityType: "invoice",
      entityId: invoice.id,
      details: { quoteId },
    });

    res.status(201).json(invoice);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("invoices", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = invoiceUpdateSchema.parse(req.body);
    const where: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const existing = await prisma.invoicePreview.findFirst({ where });
    if (!existing) throw new NotFoundError();

    const invoice = await prisma.invoicePreview.update({
      where: { id: existing.id },
      data: {
        subtotal: data.subtotal != null ? toDecimal(data.subtotal) : undefined,
        vatAmount: data.vatAmount != null ? toDecimal(data.vatAmount) : undefined,
        total: data.total != null ? toDecimal(data.total) : undefined,
        depositAmount:
          data.depositAmount != null ? toDecimal(data.depositAmount) : undefined,
        balanceDue:
          data.balanceDue != null ? toDecimal(data.balanceDue) : undefined,
        paymentStatus: data.paymentStatus,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        notes: data.notes,
        disclaimer: data.disclaimer,
      },
      include: {
        client: true,
        quote: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId: invoice.clientId,
      action: "UPDATE",
      entityType: "invoice",
      entityId: invoice.id,
    });

    res.json(invoice);
  } catch (e) {
    next(e);
  }
});

router.get(
  "/:id/pdf",
  requirePermission("invoices", "READ"),
  async (req: AuthRequest, res, next) => {
    try {
      const where: Record<string, unknown> = { id: paramId(req) };
      if (req.user!.role === "CLIENT" && req.user!.clientId) {
        where.clientId = req.user!.clientId;
      }

      const invoice = await prisma.invoicePreview.findFirst({
        where,
        include: {
          client: true,
          quote: { include: { items: { orderBy: { sortOrder: "asc" } } } },
        },
      });
      if (!invoice) throw new NotFoundError();

      const company = await loadCompanySettings();
      const pdf = await generateInvoicePdf(invoice, company);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="fattura-${invoice.number}.pdf"`
      );
      res.send(pdf);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
