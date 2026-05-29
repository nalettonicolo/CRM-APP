import { Router } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { sendEmail, emailTemplate } from "../services/email.js";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import {
  DOCUMENT_COPY,
  INVOICE_COURTESY_DISCLAIMER,
} from "../constants/documentCopy.js";
import { logActivity } from "../services/activityLog.js";
import { generateInvoicePdf } from "../services/invoicePdf.js";
import { loadCompanySettings } from "../services/quotePdf.js";
import {
  discountsFromQuote,
  invoiceDiscountSchema,
} from "../services/invoiceDiscounts.js";
import { toDecimal } from "../services/quoteCalculator.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().nullable().optional(),
  unitPrice: z.number(),
  vatRate: z.number().min(0).optional(),
  total: z.number().min(0),
});

const invoiceUpdateSchema = z.object({
  subtotal: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  depositAmount: z.number().min(0).optional(),
  balanceDue: z.number().min(0).optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID", "OVERDUE"]).optional(),
  createdAt: z.string().datetime().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  items: z.array(invoiceItemSchema).optional(),
  discounts: z.array(invoiceDiscountSchema).optional(),
  notes: z.string().nullable().optional(),
  disclaimer: z.string().min(1).optional(),
});

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FPR-${year}-`;
  const [existing, deletedLogs] = await Promise.all([
    prisma.invoicePreview.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
    }),
    prisma.activityLog.findMany({
      where: { entityType: "invoice", action: "DELETE" },
      select: { details: true },
    }),
  ]);
  const numbers = [
    ...existing.map((row) => row.number),
    ...deletedLogs
      .map((log) =>
        log.details &&
        typeof log.details === "object" &&
        !Array.isArray(log.details) &&
        "number" in log.details
          ? String(log.details.number)
          : ""
      )
      .filter((number) => number.startsWith(prefix)),
  ];
  const max = numbers.reduce((highest, number) => {
    const match = number.match(/^FPR-\d{4}-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
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

const invoiceInclude = {
  client: true,
  quote: { include: { items: { orderBy: { sortOrder: "asc" as const } } } },
  attachments: { orderBy: { createdAt: "asc" as const } },
};

router.get("/:id", requirePermission("invoices", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const where: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const invoice = await prisma.invoicePreview.findFirst({
      where,
      include: invoiceInclude,
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
      include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
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
        items: quote.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          vatRate: Number(item.vatRate),
          total: Number(item.total),
        })),
        discounts: discountsFromQuote(quote),
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
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        items: data.items,
        discounts: data.discounts,
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

router.delete("/:id", requirePermission("invoices", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    const where: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const invoice = await prisma.invoicePreview.findFirst({
      where,
      include: { attachments: true },
    });
    if (!invoice) throw new NotFoundError();

    await prisma.$transaction(async (tx) => {
      await tx.attachment.deleteMany({ where: { invoiceId: invoice.id } });
      await tx.invoicePreview.delete({ where: { id: invoice.id } });
    });

    for (const attachment of invoice.attachments) {
      const filePath = path.join(
        config.upload.dir,
        attachment.path.replace(/^\/uploads\//, "")
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await logActivity({
      userId: req.user!.userId,
      clientId: invoice.clientId,
      action: "DELETE",
      entityType: "invoice",
      entityId: invoice.id,
      details: { number: invoice.number, quoteId: invoice.quoteId },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/:id/send-email",
  requirePermission("invoices", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const where: Record<string, unknown> = { id: paramId(req) };
      if (req.user!.role === "CLIENT" && req.user!.clientId) {
        where.clientId = req.user!.clientId;
      }

      const invoice = await prisma.invoicePreview.findFirst({
        where,
        include: invoiceInclude,
      });
      if (!invoice) throw new NotFoundError();

      const email = invoice.client.email?.trim();
      if (!email) {
        throw new ValidationError("Il cliente non ha un indirizzo email");
      }
      const parsedEmail = z.string().email().safeParse(email);
      if (!parsedEmail.success) {
        throw new ValidationError(
          "Email cliente non valida — aggiorna la scheda cliente"
        );
      }

      const company = await loadCompanySettings();
      const pdf = await generateInvoicePdf(invoice, company);
      const brandName =
        typeof company.name === "string" ? company.name : "CRM";

      await sendEmail({
        to: email,
        subject: `${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${invoice.number}`,
        html: emailTemplate(
          `${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${invoice.number}`,
          `<p>In allegato trovi il documento <strong>${invoice.number}</strong>.</p>
           <p>Totale: <strong>€ ${Number(invoice.total).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</strong></p>
           ${invoice.notes ? `<p>${invoice.notes}</p>` : ""}`,
          brandName
        ),
        attachments: [
          {
            filename: `documento-${invoice.number}.pdf`,
            content: pdf,
          },
        ],
      });

      const updated = await prisma.invoicePreview.update({
        where: { id: invoice.id },
        data: { sentAt: new Date() },
        include: invoiceInclude,
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: invoice.clientId,
        action: "SEND_EMAIL",
        entityType: "invoice",
        entityId: invoice.id,
        details: { to: email },
      });

      res.json({ success: true, invoice: updated });
    } catch (e) {
      next(e);
    }
  }
);

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
        include: invoiceInclude,
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
