import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { deleteClientById } from "../services/deleteClient.js";
import { exportClientData } from "../services/clientDataExport.js";
import { NotFoundError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

const clientSchema = z.object({
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
  fiscalCode: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z
    .enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE", "ARCHIVED"])
    .optional(),
});

router.get("/", requirePermission("clients", "READ"), async (req, res, next) => {
  try {
    const { search, status, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { contactName: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { quotes: true, interventions: true, reports: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({ data: clients, total, page: parseInt(page as string) });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("clients", "READ"), async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: paramId(req) },
      include: {
        quotes: { take: 10, orderBy: { createdAt: "desc" } },
        interventions: { take: 10, orderBy: { createdAt: "desc" } },
        reports: { take: 10, orderBy: { createdAt: "desc" } },
        activities: { take: 20, orderBy: { createdAt: "desc" } },
        attachments: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    if (!client) throw new NotFoundError("Cliente non trovato");
    res.json(client);
  } catch (e) {
    next(e);
  }
});

router.get(
  "/:id/export",
  requirePermission("clients", "READ"),
  async (req, res, next) => {
    try {
      const payload = await exportClientData(paramId(req));
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="cliente-${paramId(req)}-export.json"`
      );
      res.send(JSON.stringify(payload, null, 2));
    } catch (e) {
      next(e);
    }
  }
);

router.post("/", requirePermission("clients", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({ data });
    await logActivity({
      userId: req.user!.userId,
      clientId: client.id,
      action: "CREATE",
      entityType: "client",
      entityId: client.id,
    });
    res.status(201).json(client);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("clients", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: paramId(req) },
      data,
    });
    await logActivity({
      userId: req.user!.userId,
      clientId: client.id,
      action: "UPDATE",
      entityType: "client",
      entityId: client.id,
    });
    res.json(client);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("clients", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.client.findUnique({
      where: { id },
      select: { id: true, companyName: true, contactName: true },
    });
    if (!existing) throw new NotFoundError("Cliente non trovato");

    await deleteClientById(id);

    await logActivity({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "client",
      entityId: id,
      details: {
        companyName: existing.companyName,
        contactName: existing.contactName,
      },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
