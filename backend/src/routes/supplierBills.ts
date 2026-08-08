import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const billsDir = path.join(config.upload.dir, "supplier-bills");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(billsDir, { recursive: true });
    cb(null, billsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/") ||
      /\.(pdf|png|jpe?g|webp)$/i.test(file.originalname);
    cb(null, ok);
  },
});

const router = Router();
router.use(authenticate);

const statusSchema = z.enum(["UNPAID", "PARTIAL", "PAID", "OVERDUE"]);

function resolveStatus(input: {
  status?: string;
  dueDate?: Date | null;
  paidAmount: number;
  total: number;
}): "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE" {
  if (input.status === "PAID" || input.paidAmount >= input.total - 0.01) {
    return "PAID";
  }
  if (input.paidAmount > 0) return "PARTIAL";
  if (
    input.dueDate &&
    input.dueDate.getTime() < Date.now() &&
    input.paidAmount < input.total
  ) {
    return "OVERDUE";
  }
  return (input.status as "UNPAID") || "UNPAID";
}

function unlinkStored(filePath: string | null | undefined) {
  if (!filePath) return;
  const preferred = path.join(
    config.upload.dir,
    filePath.replace(/^\/?uploads\//, "")
  );
  try {
    if (fs.existsSync(preferred)) fs.unlinkSync(preferred);
  } catch {
    /* ignore */
  }
}

router.get("/", requirePermission("invoices", "READ"), async (req, res, next) => {
  try {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const openOnly =
      req.query.open === "1" || req.query.open === "true";

    const bills = await prisma.supplierBill.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(openOnly
          ? { status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] } }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { invoiceDate: "desc" }],
    });
    res.json(bills);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("invoices", "READ"), async (req, res, next) => {
  try {
    const bill = await prisma.supplierBill.findUnique({
      where: { id: paramId(req) },
      include: { supplier: true },
    });
    if (!bill) throw new NotFoundError("Ricevuta fornitore non trovata");
    res.json(bill);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("invoices", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        number: z.string().min(1).optional(),
        supplierId: z.string().optional(),
        supplierName: z.string().min(1),
        description: z.string().optional(),
        invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
        dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
        amount: z.number().nonnegative(),
        vatAmount: z.number().nonnegative().optional(),
        total: z.number().positive().optional(),
        paidAmount: z.number().nonnegative().optional(),
        status: statusSchema.optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);

    if (data.supplierId) {
      const s = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
      if (!s) throw new ValidationError("Fornitore non valido");
    }

    const amount = data.amount;
    const vatAmount = data.vatAmount ?? 0;
    const total = data.total ?? amount + vatAmount;
    const paidAmount = data.paidAmount ?? 0;
    const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;
    const status = resolveStatus({
      status: data.status,
      dueDate,
      paidAmount,
      total,
    });

    const year = invoiceDate.getFullYear();
    const count = await prisma.supplierBill.count({
      where: { number: { startsWith: `RF-${year}-` } },
    });
    const number =
      data.number || `RF-${year}-${String(count + 1).padStart(3, "0")}`;

    const bill = await prisma.supplierBill.create({
      data: {
        number,
        supplierId: data.supplierId || null,
        supplierName: data.supplierName,
        description: data.description || null,
        invoiceDate,
        dueDate,
        amount,
        vatAmount,
        total,
        paidAmount,
        status,
        paidAt: status === "PAID" ? new Date() : null,
        reference: data.reference || null,
        notes: data.notes || null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.status(201).json(bill);
  } catch (e) {
    next(e);
  }
});

router.post(
  "/:id/document",
  requirePermission("invoices", "UPDATE"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const id = paramId(req);
      const existing = await prisma.supplierBill.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Ricevuta fornitore non trovata");
      if (!req.file) throw new ValidationError("Documento mancante");

      unlinkStored(existing.filePath);

      const relative = `/uploads/supplier-bills/${req.file.filename}`;
      const bill = await prisma.supplierBill.update({
        where: { id },
        data: {
          filePath: relative,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        },
        include: { supplier: { select: { id: true, name: true } } },
      });
      res.json(bill);
    } catch (e) {
      next(e);
    }
  }
);

router.patch("/:id", requirePermission("invoices", "UPDATE"), async (req, res, next) => {
  try {
    const existing = await prisma.supplierBill.findUnique({
      where: { id: paramId(req) },
    });
    if (!existing) throw new NotFoundError("Ricevuta fornitore non trovata");

    const data = z
      .object({
        supplierId: z.string().nullable().optional(),
        supplierName: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        invoiceDate: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
        amount: z.number().nonnegative().optional(),
        vatAmount: z.number().nonnegative().optional(),
        total: z.number().positive().optional(),
        paidAmount: z.number().nonnegative().optional(),
        status: statusSchema.optional(),
        reference: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(req.body);

    const amount = data.amount ?? Number(existing.amount);
    const vatAmount = data.vatAmount ?? Number(existing.vatAmount);
    const total = data.total ?? Number(existing.total);
    const paidAmount = data.paidAmount ?? Number(existing.paidAmount);
    const dueDate =
      data.dueDate === undefined
        ? existing.dueDate
        : data.dueDate
          ? new Date(data.dueDate)
          : null;
    const status = resolveStatus({
      status: data.status ?? existing.status,
      dueDate,
      paidAmount,
      total,
    });

    const bill = await prisma.supplierBill.update({
      where: { id: existing.id },
      data: {
        ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
        ...(data.supplierName !== undefined
          ? { supplierName: data.supplierName }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.invoiceDate
          ? { invoiceDate: new Date(data.invoiceDate) }
          : {}),
        dueDate,
        amount,
        vatAmount,
        total,
        paidAmount,
        status,
        paidAt: status === "PAID" ? existing.paidAt ?? new Date() : null,
        ...(data.reference !== undefined ? { reference: data.reference } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.json(bill);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("invoices", "DELETE"), async (req, res, next) => {
  try {
    const existing = await prisma.supplierBill.findUnique({
      where: { id: paramId(req) },
    });
    if (!existing) throw new NotFoundError("Ricevuta fornitore non trovata");
    unlinkStored(existing.filePath);
    await prisma.supplierBill.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
