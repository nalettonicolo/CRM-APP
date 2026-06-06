import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { generateTransportDocumentPdf } from "../services/transportDocumentPdf.js";
import { generateTransportDocumentNumber } from "../services/transportDocumentNumber.js";
import { toDecimal } from "../services/quoteCalculator.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  sku: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const bodySchema = z.object({
  clientId: z.string(),
  quoteId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ISSUED", "DELIVERED", "CANCELLED"]).optional(),
  issueDate: z.string().datetime().optional(),
  transportStartAt: z.string().datetime().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  recipientAddress: z.string().optional().nullable(),
  recipientCity: z.string().optional().nullable(),
  recipientProvince: z.string().optional().nullable(),
  recipientPostalCode: z.string().optional().nullable(),
  recipientVat: z.string().optional().nullable(),
  recipientFiscalCode: z.string().optional().nullable(),
  destinationAddress: z.string().optional().nullable(),
  destinationCity: z.string().optional().nullable(),
  destinationProvince: z.string().optional().nullable(),
  destinationPostalCode: z.string().optional().nullable(),
  reason: z
    .enum(["SALE", "RENTAL", "DEPOSIT", "LOAN", "RETURN", "REPAIR", "OTHER"])
    .optional(),
  carrier: z.enum(["SENDER", "RECIPIENT", "CARRIER"]).optional(),
  carrierName: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  packagesCount: z.number().int().min(0).optional().nullable(),
  grossWeightKg: z.number().min(0).optional().nullable(),
  appearance: z.string().optional().nullable(),
  referenceDoc: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

const includeRelations = {
  client: true,
  quote: { select: { id: true, number: true, title: true } },
  createdBy: { select: { firstName: true, lastName: true, email: true } },
  lines: { orderBy: { sortOrder: "asc" as const } },
};

function recipientFromClient(client: {
  companyName?: string | null;
  contactName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  vatNumber?: string | null;
  fiscalCode?: string | null;
}) {
  return {
    recipientName:
      client.companyName ||
      client.contactName ||
      [client.firstName, client.lastName].filter(Boolean).join(" ") ||
      null,
    recipientAddress: client.address,
    recipientCity: client.city,
    recipientProvince: client.province,
    recipientPostalCode: client.postalCode,
    recipientVat: client.vatNumber,
    recipientFiscalCode: client.fiscalCode,
  };
}

router.get("/", requirePermission("products", "READ"), async (_req, res, next) => {
  try {
    const documents = await prisma.transportDocument.findMany({
      include: {
        client: { select: { id: true, companyName: true, contactName: true } },
        quote: { select: { id: true, number: true } },
        lines: { select: { id: true }, take: 1 },
      },
      orderBy: { issueDate: "desc" },
    });
    res.json(documents);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("products", "READ"), async (req, res, next) => {
  try {
    const document = await prisma.transportDocument.findUnique({
      where: { id: paramId(req) },
      include: includeRelations,
    });
    if (!document) throw new NotFoundError("DDT non trovato");
    res.json(document);
  } catch (e) {
    next(e);
  }
});

router.get(
  "/:id/pdf",
  requirePermission("products", "READ"),
  async (req, res, next) => {
    try {
      const document = await prisma.transportDocument.findUnique({
        where: { id: paramId(req) },
        include: {
          client: true,
          lines: { orderBy: { sortOrder: "asc" } },
          quote: { select: { number: true, title: true } },
        },
      });
      if (!document) throw new NotFoundError("DDT non trovato");
      const pdf = await generateTransportDocumentPdf(document);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="ddt-${document.number}.pdf"`
      );
      res.send(pdf);
    } catch (e) {
      next(e);
    }
  }
);

router.post("/", requirePermission("products", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = bodySchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new NotFoundError("Cliente non trovato");

    if (data.quoteId) {
      const quote = await prisma.quote.findFirst({
        where: { id: data.quoteId, clientId: data.clientId },
      });
      if (!quote) throw new ValidationError("Preventivo non valido per questo cliente");
    }

    const recipient = recipientFromClient(client);
    const number = await generateTransportDocumentNumber();

    const document = await prisma.transportDocument.create({
      data: {
        number,
        status: data.status ?? "DRAFT",
        clientId: data.clientId,
        quoteId: data.quoteId || null,
        createdById: req.user!.userId,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        transportStartAt: data.transportStartAt
          ? new Date(data.transportStartAt)
          : null,
        recipientName: data.recipientName ?? recipient.recipientName,
        recipientAddress: data.recipientAddress ?? recipient.recipientAddress,
        recipientCity: data.recipientCity ?? recipient.recipientCity,
        recipientProvince: data.recipientProvince ?? recipient.recipientProvince,
        recipientPostalCode:
          data.recipientPostalCode ?? recipient.recipientPostalCode,
        recipientVat: data.recipientVat ?? recipient.recipientVat,
        recipientFiscalCode:
          data.recipientFiscalCode ?? recipient.recipientFiscalCode,
        destinationAddress: data.destinationAddress,
        destinationCity: data.destinationCity,
        destinationProvince: data.destinationProvince,
        destinationPostalCode: data.destinationPostalCode,
        reason: data.reason ?? "RENTAL",
        carrier: data.carrier ?? "SENDER",
        carrierName: data.carrierName,
        vehiclePlate: data.vehiclePlate,
        driverName: data.driverName,
        packagesCount: data.packagesCount ?? null,
        grossWeightKg:
          data.grossWeightKg != null ? toDecimal(data.grossWeightKg) : null,
        appearance: data.appearance,
        referenceDoc: data.referenceDoc,
        notes: data.notes,
        lines: {
          create: data.lines.map((line, index) => ({
            description: line.description,
            quantity: toDecimal(line.quantity),
            unit: line.unit?.trim() || "pz",
            sku: line.sku || null,
            productId: line.productId || null,
            notes: line.notes || null,
            sortOrder: line.sortOrder ?? index,
          })),
        },
      },
      include: includeRelations,
    });

    await logActivity({
      userId: req.user!.userId,
      clientId: data.clientId,
      action: "CREATE",
      entityType: "transport_document",
      entityId: document.id,
      details: { number: document.number },
    });

    res.status(201).json(document);
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/:id",
  requirePermission("products", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const id = paramId(req);
      const existing = await prisma.transportDocument.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!existing) throw new NotFoundError("DDT non trovato");

      const data = bodySchema.partial().extend({
        lines: z.array(lineSchema).min(1).optional(),
      }).parse(req.body);

      if (data.clientId && data.quoteId) {
        const quote = await prisma.quote.findFirst({
          where: { id: data.quoteId, clientId: data.clientId },
        });
        if (!quote) {
          throw new ValidationError("Preventivo non valido per questo cliente");
        }
      }

      const document = await prisma.$transaction(async (tx) => {
        if (data.lines) {
          await tx.transportDocumentLine.deleteMany({ where: { documentId: id } });
          await tx.transportDocumentLine.createMany({
            data: data.lines.map((line, index) => ({
              documentId: id,
              description: line.description,
              quantity: toDecimal(line.quantity),
              unit: line.unit?.trim() || "pz",
              sku: line.sku || null,
              productId: line.productId || null,
              notes: line.notes || null,
              sortOrder: line.sortOrder ?? index,
            })),
          });
        }

        return tx.transportDocument.update({
          where: { id },
          data: {
            ...(data.status !== undefined && { status: data.status }),
            ...(data.clientId !== undefined && { clientId: data.clientId }),
            ...(data.quoteId !== undefined && { quoteId: data.quoteId }),
            ...(data.issueDate !== undefined && {
              issueDate: new Date(data.issueDate),
            }),
            ...(data.transportStartAt !== undefined && {
              transportStartAt: data.transportStartAt
                ? new Date(data.transportStartAt)
                : null,
            }),
            ...(data.recipientName !== undefined && {
              recipientName: data.recipientName,
            }),
            ...(data.recipientAddress !== undefined && {
              recipientAddress: data.recipientAddress,
            }),
            ...(data.recipientCity !== undefined && {
              recipientCity: data.recipientCity,
            }),
            ...(data.recipientProvince !== undefined && {
              recipientProvince: data.recipientProvince,
            }),
            ...(data.recipientPostalCode !== undefined && {
              recipientPostalCode: data.recipientPostalCode,
            }),
            ...(data.recipientVat !== undefined && {
              recipientVat: data.recipientVat,
            }),
            ...(data.recipientFiscalCode !== undefined && {
              recipientFiscalCode: data.recipientFiscalCode,
            }),
            ...(data.destinationAddress !== undefined && {
              destinationAddress: data.destinationAddress,
            }),
            ...(data.destinationCity !== undefined && {
              destinationCity: data.destinationCity,
            }),
            ...(data.destinationProvince !== undefined && {
              destinationProvince: data.destinationProvince,
            }),
            ...(data.destinationPostalCode !== undefined && {
              destinationPostalCode: data.destinationPostalCode,
            }),
            ...(data.reason !== undefined && { reason: data.reason }),
            ...(data.carrier !== undefined && { carrier: data.carrier }),
            ...(data.carrierName !== undefined && {
              carrierName: data.carrierName,
            }),
            ...(data.vehiclePlate !== undefined && {
              vehiclePlate: data.vehiclePlate,
            }),
            ...(data.driverName !== undefined && { driverName: data.driverName }),
            ...(data.packagesCount !== undefined && {
              packagesCount: data.packagesCount,
            }),
            ...(data.grossWeightKg !== undefined && {
              grossWeightKg:
                data.grossWeightKg != null
                  ? toDecimal(data.grossWeightKg)
                  : null,
            }),
            ...(data.appearance !== undefined && { appearance: data.appearance }),
            ...(data.referenceDoc !== undefined && {
              referenceDoc: data.referenceDoc,
            }),
            ...(data.notes !== undefined && { notes: data.notes }),
          },
          include: includeRelations,
        });
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: document.clientId,
        action: "UPDATE",
        entityType: "transport_document",
        entityId: document.id,
        details: { number: document.number },
      });

      res.json(document);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id",
  requirePermission("products", "DELETE"),
  async (req: AuthRequest, res, next) => {
    try {
      const id = paramId(req);
      const existing = await prisma.transportDocument.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("DDT non trovato");

      await prisma.transportDocument.delete({ where: { id } });

      await logActivity({
        userId: req.user!.userId,
        clientId: existing.clientId,
        action: "DELETE",
        entityType: "transport_document",
        entityId: id,
        details: { number: existing.number },
      });

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
