import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { calculateQuoteTotals, toDecimal } from "../services/quoteCalculator.js";
import {
  resolvePaymentTerms,
  type PaymentTermInput,
} from "../services/paymentTerms.js";
import { paymentTermInputSchema } from "./paymentTermTemplates.js";
import { logActivity } from "../services/activityLog.js";
import { sendEmail, emailTemplate } from "../services/email.js";
import { generateQuotePdf, loadCompanySettings } from "../services/quotePdf.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";
import { syncQuoteCalendarEvent } from "../services/quoteCalendar.js";

const quoteItemInputSchema = z.object({
  type: z.enum(["service", "product", "custom"]).default("custom"),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  vatRate: z.number().optional(),
  discount: z.number().optional(),
  serviceId: z.string().optional(),
  productId: z.string().optional(),
  unit: z.string().optional(),
});

const router = Router();
router.use(authenticate);

function paymentTermsForCalc(
  terms: z.infer<typeof paymentTermInputSchema>[] | undefined
): PaymentTermInput[] | undefined {
  if (!terms?.length) return undefined;
  return terms.map((t) => ({
    label: t.label,
    note: t.note,
    percent: t.percent,
    amount: t.amount,
    isBalance: t.isBalance,
  }));
}

const taxFieldsSchema = z.object({
  withholdingTaxPercent: z.number().min(0).max(100).optional(),
  withholdingTaxAmount: z.number().min(0).optional(),
  stampDutyAmount: z.number().min(0).optional(),
});

function calcOptions(
  body: z.infer<typeof taxFieldsSchema> & {
    discountPercent?: number;
    discountAmount?: number;
    depositPercent?: number;
    depositAmount?: number;
    paymentTerms?: z.infer<typeof paymentTermInputSchema>[];
  },
  existing?: {
    discountPercent: unknown;
    discountAmount: unknown;
    depositPercent: unknown;
    withholdingTaxPercent: unknown;
    withholdingTaxAmount: unknown;
    stampDutyAmount: unknown;
    paymentTerms: { label: string; note: string | null; percent: unknown; amount: unknown; isBalance: boolean }[];
  }
) {
  return {
    discountPercent:
      body.discountPercent ??
      (existing ? Number(existing.discountPercent) : 0),
    discountAmount:
      body.discountAmount ?? (existing ? Number(existing.discountAmount) : 0),
    depositPercent: body.depositPercent,
    depositAmount: body.depositAmount,
    paymentTerms: paymentTermsForCalc(body.paymentTerms),
    withholdingTaxPercent:
      body.withholdingTaxPercent ??
      (existing ? Number(existing.withholdingTaxPercent) : 0),
    withholdingTaxAmount: body.withholdingTaxAmount,
    stampDutyAmount:
      body.stampDutyAmount ??
      (existing ? Number(existing.stampDutyAmount) : 0),
  };
}

function decimalTaxFields(totals: ReturnType<typeof calculateQuoteTotals>) {
  return {
    subtotal: toDecimal(totals.subtotal),
    vatAmount: toDecimal(totals.vatAmount),
    total: toDecimal(totals.total),
    depositAmount: toDecimal(totals.depositAmount),
    balanceDue: toDecimal(totals.balanceDue),
    withholdingTaxAmount: toDecimal(totals.withholdingTaxAmount),
    stampDutyAmount: toDecimal(totals.stampDutyAmount),
    netPayable: toDecimal(totals.netPayable),
  };
}

function buildPaymentTermsCreate(
  total: number,
  terms: z.infer<typeof paymentTermInputSchema>[] | undefined
) {
  if (!terms?.length) return undefined;
  const resolved = resolvePaymentTerms(total, paymentTermsForCalc(terms)!);
  return {
    create: resolved.map((t, idx) => ({
      label: t.label,
      note: t.note || undefined,
      percent: t.percent != null ? toDecimal(t.percent) : undefined,
      amount: toDecimal(t.amount),
      isBalance: t.isBalance === true,
      sortOrder: idx,
    })),
  };
}

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
        paymentTerms: { orderBy: { sortOrder: "asc" } },
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
        eventAt: z.string().datetime().optional(),
        notes: z.string().optional(),
        discountPercent: z.number().optional(),
        discountAmount: z.number().optional(),
        depositPercent: z.number().optional(),
        depositAmount: z.number().optional(),
        paymentTerms: z.array(paymentTermInputSchema).optional(),
        items: z.array(quoteItemInputSchema).optional(),
      })
      .merge(taxFieldsSchema)
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
      calcOptions(body)
    );

    const number = await generateQuoteNumber();
    const paymentTermsCreate = buildPaymentTermsCreate(
      totals.total,
      body.paymentTerms
    );
    const quote = await prisma.quote.create({
      data: {
        number,
        clientId: body.clientId,
        createdById: req.user!.userId,
        title: body.title,
        category: body.category,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        eventAt: body.eventAt ? new Date(body.eventAt) : undefined,
        notes: body.notes,
        discountPercent: toDecimal(body.discountPercent || 0),
        discountAmount: toDecimal(body.discountAmount || 0),
        depositPercent: toDecimal(totals.depositAmount > 0 && totals.total > 0
          ? (totals.depositAmount / totals.total) * 100
          : body.depositPercent || 0),
        withholdingTaxPercent: toDecimal(body.withholdingTaxPercent || 0),
        ...decimalTaxFields(totals),
        items: {
          create: items.map((item, idx) => ({
            type: item.type,
            description: item.description,
            quantity: toDecimal(item.quantity),
            unitPrice: toDecimal(item.unitPrice),
            vatRate: toDecimal(item.vatRate ?? 22),
            discount: toDecimal(item.discount ?? 0),
            unit: item.unit || undefined,
            total: toDecimal(
              item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
            ),
            serviceId: item.serviceId,
            productId: item.productId,
            sortOrder: idx,
          })),
        },
        ...(paymentTermsCreate && { paymentTerms: paymentTermsCreate }),
      },
      include: {
        items: true,
        paymentTerms: { orderBy: { sortOrder: "asc" } },
        client: true,
      },
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

async function loadQuoteForPdf(id: string, user: AuthRequest["user"]) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      paymentTerms: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quote) throw new NotFoundError();
  if (user?.role === "CLIENT" && quote.clientId !== user.clientId) {
    throw new NotFoundError();
  }
  return quote;
}

router.post(
  "/:id/sign",
  requirePermission("quotes", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const { signature } = z
        .object({ signature: z.string().min(20) })
        .parse(req.body);

      const existing = await prisma.quote.findUnique({
        where: { id: paramId(req) },
      });
      if (!existing) throw new NotFoundError();
      if (["REJECTED", "CANCELLED", "EXPIRED"].includes(existing.status)) {
        throw new ValidationError(
          "Il preventivo non può essere firmato in questo stato"
        );
      }

      const updated = await prisma.quote.update({
        where: { id: existing.id },
        data: {
          clientSignature: signature,
          signedByClient: true,
          signedAt: new Date(),
          status: "ACCEPTED",
          acceptedAt: existing.acceptedAt ?? new Date(),
        },
        include: {
          client: true,
          items: { orderBy: { sortOrder: "asc" } },
          paymentTerms: { orderBy: { sortOrder: "asc" } },
        },
      });

      await syncQuoteCalendarEvent(updated.id);

      await logActivity({
        userId: req.user!.userId,
        clientId: updated.clientId,
        action: "SIGN",
        entityType: "quote",
        entityId: updated.id,
        details: { staffRecorded: true },
      });

      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/:id/pdf",
  requirePermission("quotes", "READ"),
  async (req: AuthRequest, res, next) => {
    try {
      const quote = await loadQuoteForPdf(paramId(req), req.user);
      const company = await loadCompanySettings();
      const pdf = await generateQuotePdf(quote, company);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="preventivo-${quote.number}.pdf"`
      );
      res.send(pdf);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/:id/send-email",
  requirePermission("quotes", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const quote = await loadQuoteForPdf(paramId(req), req.user);
      const email = quote.client.email?.trim();
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
      const pdf = await generateQuotePdf(quote, company);
      const brandName =
        typeof company.name === "string" ? company.name : "CRM";

      await sendEmail({
        to: email,
        subject: `Preventivo ${quote.number}`,
        html: emailTemplate(
          `Preventivo ${quote.number}`,
          `<p>In allegato trovi il preventivo <strong>${quote.number}</strong>.</p>
           ${quote.title ? `<p>${quote.title}</p>` : ""}
           <p>Totale: <strong>€ ${Number(quote.total).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</strong></p>`,
          brandName
        ),
        attachments: [
          {
            filename: `preventivo-${quote.number}.pdf`,
            content: pdf,
          },
        ],
      });

      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: quote.clientId,
        action: "SEND_EMAIL",
        entityType: "quote",
        entityId: quote.id,
        details: { to: email },
      });

      res.json({ success: true, quote: updated });
    } catch (e) {
      next(e);
    }
  }
);

router.patch("/:id", requirePermission("quotes", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .object({
        clientId: z.string().optional(),
        title: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        validUntil: z.string().datetime().optional().nullable(),
        eventAt: z.string().datetime().optional().nullable(),
        notes: z.string().optional().nullable(),
        internalNotes: z.string().optional().nullable(),
        discountPercent: z.number().optional(),
        discountAmount: z.number().optional(),
        depositPercent: z.number().optional(),
        depositAmount: z.number().optional(),
        paymentTerms: z.array(paymentTermInputSchema).optional(),
        items: z.array(quoteItemInputSchema).optional(),
        status: z
          .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"])
          .optional(),
        signedByClient: z.boolean().optional(),
      })
      .merge(taxFieldsSchema)
      .parse(req.body);

    const existing = await prisma.quote.findUnique({
      where: { id: paramId(req) },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        paymentTerms: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!existing) throw new NotFoundError();

    const itemsForCalc = body.items
      ? body.items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          vatRate: i.vatRate,
          discount: i.discount,
        }))
      : existing.items.map((i) => ({
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          vatRate: Number(i.vatRate),
          discount: Number(i.discount),
        }));

    const paymentTermsInput =
      body.paymentTerms !== undefined
        ? paymentTermsForCalc(body.paymentTerms)
        : existing.paymentTerms.length
          ? existing.paymentTerms.map((t) => ({
              label: t.label,
              note: t.note,
              percent: t.percent != null ? Number(t.percent) : null,
              amount: Number(t.amount),
              isBalance: t.isBalance,
            }))
          : undefined;

    const calcOpts = calcOptions(
      {
        discountPercent: body.discountPercent,
        discountAmount: body.discountAmount,
        depositPercent: body.depositPercent,
        depositAmount: body.depositAmount,
        withholdingTaxPercent: body.withholdingTaxPercent,
        withholdingTaxAmount: body.withholdingTaxAmount,
        stampDutyAmount: body.stampDutyAmount,
      },
      existing
    );
    const totals = calculateQuoteTotals(itemsForCalc, {
      ...calcOpts,
      paymentTerms: paymentTermsInput,
    });

    const paymentTermsCreate = buildPaymentTermsCreate(
      totals.total,
      body.paymentTerms
    );

    const quote = await prisma.$transaction(async (tx) => {
      if (body.items) {
        await tx.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      }
      if (body.paymentTerms !== undefined) {
        await tx.quotePaymentTerm.deleteMany({ where: { quoteId: existing.id } });
      }

      return tx.quote.update({
        where: { id: existing.id },
        data: {
          ...(body.clientId !== undefined && { clientId: body.clientId }),
          ...(body.title !== undefined && { title: body.title }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.internalNotes !== undefined && {
            internalNotes: body.internalNotes,
          }),
          ...(body.validUntil !== undefined && {
            validUntil: body.validUntil ? new Date(body.validUntil) : null,
          }),
          ...(body.eventAt !== undefined && {
            eventAt: body.eventAt ? new Date(body.eventAt) : null,
          }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.discountPercent !== undefined && {
            discountPercent: toDecimal(body.discountPercent),
          }),
          ...(body.discountAmount !== undefined && {
            discountAmount: toDecimal(body.discountAmount),
          }),
          depositPercent: toDecimal(
            totals.total > 0
              ? (totals.depositAmount / totals.total) * 100
              : 0
          ),
          ...(body.withholdingTaxPercent !== undefined && {
            withholdingTaxPercent: toDecimal(body.withholdingTaxPercent),
          }),
          ...decimalTaxFields(totals),
          ...(body.items && {
            items: {
              create: body.items.map((item, idx) => ({
                type: item.type,
                description: item.description,
                quantity: toDecimal(item.quantity),
                unitPrice: toDecimal(item.unitPrice),
                vatRate: toDecimal(item.vatRate ?? 22),
                discount: toDecimal(item.discount ?? 0),
                unit: item.unit || undefined,
                total: toDecimal(
                  item.quantity *
                    item.unitPrice *
                    (1 - (item.discount || 0) / 100)
                ),
                serviceId: item.serviceId,
                productId: item.productId,
                sortOrder: idx,
              })),
            },
          }),
          ...(paymentTermsCreate && { paymentTerms: paymentTermsCreate }),
          ...(body.status === "SENT" && { sentAt: new Date() }),
          ...(body.status === "ACCEPTED" && {
            acceptedAt: new Date(),
            signedByClient: true,
          }),
          ...(body.status === "REJECTED" && { rejectedAt: new Date() }),
          ...(body.signedByClient && { signedAt: new Date(), signedByClient: true }),
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          paymentTerms: { orderBy: { sortOrder: "asc" } },
          client: true,
        },
      });
    });

    await logActivity({
      userId: req.user!.userId,
      clientId: quote.clientId,
      action: "UPDATE",
      entityType: "quote",
      entityId: quote.id,
    });

    if (body.status === "ACCEPTED" || quote.status === "ACCEPTED") {
      await syncQuoteCalendarEvent(quote.id);
    }

    res.json(quote);
  } catch (e) {
    next(e);
  }
});

export default router;
