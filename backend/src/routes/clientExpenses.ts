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

const expensesDir = path.join(config.upload.dir, "client-expenses");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(expensesDir, { recursive: true });
    cb(null, expensesDir);
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
    const clientId =
      typeof req.query.clientId === "string" ? req.query.clientId : undefined;

    const expenses = await prisma.clientExpense.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(clientId ? { clientId } : {}),
        ...(openOnly
          ? { status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] } }
          : {}),
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
      },
      orderBy: [{ dueDate: "asc" }, { expenseDate: "desc" }],
    });
    res.json(expenses);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("invoices", "READ"), async (req, res, next) => {
  try {
    const expense = await prisma.clientExpense.findUnique({
      where: { id: paramId(req) },
      include: { client: true },
    });
    if (!expense) throw new NotFoundError("Spesa cliente non trovata");
    res.json(expense);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("invoices", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        number: z.string().min(1).optional(),
        clientId: z.string().optional(),
        clientName: z.string().min(1),
        category: z.string().optional(),
        description: z.string().optional(),
        expenseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
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

    if (data.clientId) {
      const c = await prisma.client.findUnique({ where: { id: data.clientId } });
      if (!c) throw new ValidationError("Cliente non valido");
    }

    const amount = data.amount;
    const vatAmount = data.vatAmount ?? 0;
    const total = data.total ?? amount + vatAmount;
    const paidAmount = data.paidAmount ?? 0;
    const expenseDate = data.expenseDate ? new Date(data.expenseDate) : new Date();
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;
    const status = resolveStatus({
      status: data.status,
      dueDate,
      paidAmount,
      total,
    });

    const year = expenseDate.getFullYear();
    const count = await prisma.clientExpense.count({
      where: { number: { startsWith: `SP-${year}-` } },
    });
    const number =
      data.number || `SP-${year}-${String(count + 1).padStart(3, "0")}`;

    const expense = await prisma.clientExpense.create({
      data: {
        number,
        clientId: data.clientId || null,
        clientName: data.clientName,
        category: data.category || null,
        description: data.description || null,
        expenseDate,
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
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          },
        },
      },
    });
    res.status(201).json(expense);
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
      const existing = await prisma.clientExpense.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Spesa cliente non trovata");
      if (!req.file) throw new ValidationError("Documento mancante");

      unlinkStored(existing.filePath);

      const relative = `/uploads/client-expenses/${req.file.filename}`;
      const expense = await prisma.clientExpense.update({
        where: { id },
        data: {
          filePath: relative,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        },
        include: {
          client: {
            select: { id: true, companyName: true, contactName: true },
          },
        },
      });
      res.json(expense);
    } catch (e) {
      next(e);
    }
  }
);

router.patch("/:id", requirePermission("invoices", "UPDATE"), async (req, res, next) => {
  try {
    const existing = await prisma.clientExpense.findUnique({
      where: { id: paramId(req) },
    });
    if (!existing) throw new NotFoundError("Spesa cliente non trovata");

    const data = z
      .object({
        clientId: z.string().nullable().optional(),
        clientName: z.string().min(1).optional(),
        category: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        expenseDate: z.string().optional().nullable(),
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

    const expense = await prisma.clientExpense.update({
      where: { id: existing.id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.clientName !== undefined ? { clientName: data.clientName } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.expenseDate
          ? { expenseDate: new Date(data.expenseDate) }
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
      include: {
        client: {
          select: { id: true, companyName: true, contactName: true },
        },
      },
    });
    res.json(expense);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("invoices", "DELETE"), async (req, res, next) => {
  try {
    const existing = await prisma.clientExpense.findUnique({
      where: { id: paramId(req) },
    });
    if (!existing) throw new NotFoundError("Spesa cliente non trovata");
    unlinkStored(existing.filePath);
    await prisma.clientExpense.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
