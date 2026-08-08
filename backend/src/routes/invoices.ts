import { Router } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { invoiceEmailBody } from "../constants/emailBodies.js";
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
import {
  assertCanEditDocumentCreatedAt,
  canEditDocumentCreatedAt,
  generateSequentialDocumentNumber,
} from "../services/documentSequence.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";
import {
  INVOICE_PAYMENT_METHODS,
  INVOICE_PAYMENT_TIMINGS,
} from "../constants/invoicePayment.js";

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
  paymentMethod: z.enum(INVOICE_PAYMENT_METHODS).optional(),
  paymentTiming: z.enum(INVOICE_PAYMENT_TIMINGS).optional(),
  createdAt: z.string().datetime().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  eventAt: z.string().datetime().nullable().optional(),
  eventEndAt: z.string().datetime().nullable().optional(),
  eventLocation: z.string().nullable().optional(),
  items: z.array(invoiceItemSchema).optional(),
  discounts: z.array(invoiceDiscountSchema).optional(),
  notes: z.string().nullable().optional(),
  disclaimer: z.string().min(1).optional(),
  showWebsite: z.boolean().optional(),
  showQuoteRef: z.boolean().optional(),
});

async function generateInvoiceNumber(): Promise<string> {
  return generateSequentialDocumentNumber("invoice", {
    legacyPrefixes: ["FPR"],
  });
}

function canEditInvoiceCreatedAt(invoice: { status: "DRAFT" | "CONFIRMED"; number: string | null }) {
  if (invoice.status === "DRAFT") return Promise.resolve(true);
  if (!invoice.number) return Promise.resolve(true);
  return canEditDocumentCreatedAt("invoice", invoice.number);
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
  jobOrder: {
    select: {
      id: true,
      number: true,
      title: true,
      dailyReports: { orderBy: { workDate: "asc" as const } },
    },
  },
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
    res.json({
      ...invoice,
      canEditCreatedAt: await canEditInvoiceCreatedAt(invoice),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("invoices", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .object({
        quoteId: z.string().optional(),
        jobOrderId: z.string().optional(),
        reportIds: z.array(z.string()).optional(),
      })
      .parse(req.body);

    if (body.jobOrderId) {
      const job = await prisma.jobOrder.findUnique({
        where: { id: body.jobOrderId },
        include: {
          dailyReports: { orderBy: { workDate: "asc" } },
        },
      });
      if (!job) throw new NotFoundError("Commessa non trovata");

      const selected = body.reportIds?.length
        ? job.dailyReports.filter((r) => body.reportIds!.includes(r.id))
        : job.dailyReports;
      if (!selected.length) {
        throw new ValidationError("Seleziona almeno un report giornaliero");
      }

      const items: Array<{
        description: string;
        quantity: number;
        unit: string | null;
        unitPrice: number;
        vatRate: number;
        total: number;
      }> = [];

      for (const report of selected) {
        const dateLabel = new Date(report.workDate).toLocaleDateString("it-IT");
        items.push({
          description: `Report ${report.number} — ${dateLabel}${
            report.description ? `: ${report.description}` : ""
          }`,
          quantity: Number(report.workHours) || 1,
          unit: Number(report.workHours) > 0 ? "ora" : "gg",
          unitPrice: 0,
          vatRate: 22,
          total: 0,
        });
        const materials = Array.isArray(report.materials)
          ? (report.materials as Array<Record<string, unknown>>)
          : [];
        for (const mat of materials) {
          const name = String(mat.name || mat.description || "Materiale");
          const qty = Number(mat.quantity ?? 1) || 1;
          const unitPrice = Number(mat.unitPrice ?? 0) || 0;
          items.push({
            description: name,
            quantity: qty,
            unit: mat.unit ? String(mat.unit) : "pz",
            unitPrice,
            vatRate: 22,
            total: qty * unitPrice,
          });
        }
        const expenses = Number(report.expensesAmount) || 0;
        if (expenses > 0) {
          items.push({
            description: report.expensesNotes || `Spese ${report.number}`,
            quantity: 1,
            unit: "corpo",
            unitPrice: expenses,
            vatRate: 22,
            total: expenses,
          });
        }
      }

      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const vatAmount = Math.round(subtotal * 0.22 * 100) / 100;
      const total = subtotal + vatAmount;

      const invoice = await prisma.invoicePreview.create({
        data: {
          number: null,
          clientId: job.clientId,
          jobOrderId: job.id,
          quoteId: job.quoteId,
          subtotal,
          vatAmount,
          total,
          depositAmount: 0,
          balanceDue: total,
          items,
          disclaimer: INVOICE_COURTESY_DISCLAIMER,
          notes: `Documento da commessa ${job.number} — report: ${selected
            .map((r) => r.number)
            .join(", ")}`,
          status: "DRAFT",
        },
        include: invoiceInclude,
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: job.clientId,
        action: "CREATE",
        entityType: "invoice",
        entityId: invoice.id,
        details: { jobOrderId: job.id, reportIds: selected.map((r) => r.id) },
      });

      return res.status(201).json(invoice);
    }

    const quoteId = body.quoteId;
    if (!quoteId) throw new ValidationError("Indica un preventivo o una commessa");

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

    const companySetting = await prisma.setting.findUnique({
      where: { key: "company" },
      select: { value: true },
    });
    const company =
      companySetting?.value &&
      typeof companySetting.value === "object" &&
      !Array.isArray(companySetting.value)
        ? (companySetting.value as Record<string, unknown>)
        : {};
    const showWebsite =
      typeof company.showWebsiteInDocuments === "boolean"
        ? company.showWebsiteInDocuments
        : true;
    const showQuoteRef =
      typeof company.showQuoteReferencesInDocuments === "boolean"
        ? company.showQuoteReferencesInDocuments
        : true;
    const invoice = await prisma.invoicePreview.create({
      data: {
        number: null,
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
        showWebsite,
        showQuoteRef,
        eventAt: quote.eventAt,
        eventEndAt: quote.eventEndAt,
        eventLocation: quote.eventLocation,
        paymentMethod: quote.paymentMethod,
        paymentTiming: quote.paymentTiming,
        dueDate: quote.validUntil,
        status: "DRAFT",
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

    if (data.createdAt && existing.status !== "DRAFT" && existing.number) {
      await assertCanEditDocumentCreatedAt(
        "invoice",
        existing.number,
        existing.createdAt,
        new Date(data.createdAt)
      );
    }

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
        paymentMethod: data.paymentMethod,
        paymentTiming: data.paymentTiming,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        eventAt: data.eventAt ? new Date(data.eventAt) : data.eventAt === null ? null : undefined,
        eventEndAt: data.eventEndAt
          ? new Date(data.eventEndAt)
          : data.eventEndAt === null
            ? null
            : undefined,
        eventLocation: data.eventLocation,
        items: data.items,
        discounts: data.discounts,
        notes: data.notes,
        disclaimer: data.disclaimer,
        showWebsite: data.showWebsite,
        showQuoteRef: data.showQuoteRef,
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

    res.json({
      ...invoice,
      canEditCreatedAt: await canEditInvoiceCreatedAt(invoice),
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/:id/confirm",
  requirePermission("invoices", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const where: Record<string, unknown> = { id: paramId(req) };
      if (req.user!.role === "CLIENT" && req.user!.clientId) {
        where.clientId = req.user!.clientId;
      }

      const existing = await prisma.invoicePreview.findFirst({
        where,
        include: invoiceInclude,
      });
      if (!existing) throw new NotFoundError();

      if (existing.status === "CONFIRMED" && existing.number) {
        return res.json({
          ...existing,
          canEditCreatedAt: await canEditInvoiceCreatedAt(existing),
        });
      }

      const number = await generateInvoiceNumber();
      const invoice = await prisma.invoicePreview.update({
        where: { id: existing.id },
        data: {
          number,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
        include: invoiceInclude,
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: invoice.clientId,
        action: "UPDATE",
        entityType: "invoice",
        entityId: invoice.id,
        details: { status: "CONFIRMED", number },
      });

      res.json({
        ...invoice,
        canEditCreatedAt: await canEditInvoiceCreatedAt(invoice),
      });
    } catch (e) {
      next(e);
    }
  }
);

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
      if (invoice.status !== "CONFIRMED" || !invoice.number) {
        throw new ValidationError(
          "Conferma prima la bozza per inviare il documento via email."
        );
      }

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
          invoiceEmailBody({ number: invoice.number }),
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
      const fileBase = invoice.number || `bozza-${invoice.id.slice(0, 8)}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="documento-${fileBase}.pdf"`
      );
      res.send(pdf);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
