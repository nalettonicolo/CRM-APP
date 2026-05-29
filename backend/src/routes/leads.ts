import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { NotFoundError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("leads", "READ"), async (req, res, next) => {
  try {
    const { status, assignedTo, page = "1", limit = "20" } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const [data, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { id: true, companyName: true, contactName: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ data, total, page: pageNum, limit: take });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/:id",
  requirePermission("leads", "READ"),
  async (req: AuthRequest, res, next) => {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: paramId(req) },
        include: {
          client: {
            select: { id: true, companyName: true, contactName: true, email: true },
          },
        },
      });
      if (!lead) throw new NotFoundError();
      res.json(lead);
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/:id",
  requirePermission("leads", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const body = z
        .object({
          status: z.string().optional(),
          assignedTo: z.string().nullable().optional(),
          convertToClient: z.boolean().optional(),
        })
        .parse(req.body);

      const lead = await prisma.lead.findUnique({
        where: { id: paramId(req) },
      });
      if (!lead) throw new NotFoundError();

      let clientId = lead.clientId;

      if (body.convertToClient && !lead.clientId) {
        const parts = lead.name.trim().split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;

        const client = await prisma.client.create({
          data: {
            companyName: lead.company || undefined,
            contactName: lead.name,
            firstName,
            lastName,
            email: lead.email,
            phone: lead.phone || undefined,
            status: "LEAD",
            notes: lead.message || undefined,
          },
        });
        clientId = client.id;

        await logActivity({
          userId: req.user!.userId,
          clientId: client.id,
          action: "CREATE",
          entityType: "client",
          entityId: client.id,
          details: { fromLeadId: lead.id },
        });
      }

      const updated = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: body.status,
          assignedTo: body.assignedTo,
          clientId,
        },
        include: {
          client: {
            select: { id: true, companyName: true, contactName: true, email: true },
          },
        },
      });

      await logActivity({
        userId: req.user!.userId,
        action: "UPDATE",
        entityType: "lead",
        entityId: updated.id,
        details: body,
      });

      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id",
  requirePermission("leads", "DELETE"),
  async (req: AuthRequest, res, next) => {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: paramId(req) } });
      if (!lead) throw new NotFoundError();

      await prisma.lead.delete({ where: { id: lead.id } });

      await logActivity({
        userId: req.user!.userId,
        action: "DELETE",
        entityType: "lead",
        entityId: lead.id,
        details: { name: lead.name },
      });

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
