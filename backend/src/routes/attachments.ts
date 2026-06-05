import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { z } from "zod";
import type { AttachmentEntity } from "@prisma/client";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const attachmentsDir = path.join(config.upload.dir, "attachments");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(attachmentsDir, { recursive: true });
    cb(null, attachmentsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
});

const entityTypeMap: Record<string, AttachmentEntity> = {
  client: "CLIENT",
  quote: "QUOTE",
  intervention: "INTERVENTION",
  report: "REPORT",
  invoice: "INVOICE_PREVIEW",
  site_visit: "SITE_VISIT",
};

const router = Router();
router.use(authenticate);

async function assertEntityExists(
  entityType: AttachmentEntity,
  entityId: string
): Promise<string | undefined> {
  switch (entityType) {
    case "CLIENT": {
      const client = await prisma.client.findUnique({ where: { id: entityId } });
      if (!client) throw new NotFoundError();
      return client.id;
    }
    case "QUOTE": {
      const quote = await prisma.quote.findUnique({ where: { id: entityId } });
      if (!quote) throw new NotFoundError();
      return quote.clientId;
    }
    case "INTERVENTION": {
      const intervention = await prisma.intervention.findUnique({
        where: { id: entityId },
      });
      if (!intervention) throw new NotFoundError();
      return intervention.clientId;
    }
    case "REPORT": {
      const report = await prisma.interventionReport.findUnique({
        where: { id: entityId },
      });
      if (!report) throw new NotFoundError();
      return report.clientId;
    }
    case "INVOICE_PREVIEW": {
      const invoice = await prisma.invoicePreview.findUnique({
        where: { id: entityId },
      });
      if (!invoice) throw new NotFoundError();
      return invoice.clientId;
    }
    case "SITE_VISIT": {
      const sheet = await prisma.siteVisit.findUnique({
        where: { id: entityId },
      });
      if (!sheet) throw new NotFoundError();
      return sheet.clientId ?? undefined;
    }
    default:
      throw new ValidationError("Tipo entità non supportato");
  }
}

function attachmentData(
  entityType: AttachmentEntity,
  entityId: string,
  clientId?: string
) {
  return {
    entityType,
    entityId,
    clientId: entityType === "CLIENT" ? entityId : clientId,
    quoteId: entityType === "QUOTE" ? entityId : undefined,
    reportId: entityType === "REPORT" ? entityId : undefined,
    invoiceId: entityType === "INVOICE_PREVIEW" ? entityId : undefined,
    siteVisitId: entityType === "SITE_VISIT" ? entityId : undefined,
  };
}

router.post(
  "/",
  requirePermission("attachments", "CREATE"),
  upload.single("file"),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) throw new ValidationError("File mancante");

      const { entityType, entityId } = z
        .object({
          entityType: z.enum([
            "client",
            "quote",
            "intervention",
            "report",
            "invoice",
            "site_visit",
          ]),
          entityId: z.string().min(1),
        })
        .parse(req.body);

      const mapped = entityTypeMap[entityType];
      const clientId = await assertEntityExists(mapped, entityId);

      if (
        req.user!.role === "CLIENT" &&
        clientId &&
        clientId !== req.user!.clientId
      ) {
        throw new NotFoundError();
      }

      const relativePath = `/uploads/attachments/${req.file.filename}`;
      const record = await prisma.attachment.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: relativePath,
          uploadedById: req.user!.userId,
          ...attachmentData(mapped, entityId, clientId),
        },
      });

      await logActivity({
        userId: req.user!.userId,
        clientId,
        action: "UPLOAD",
        entityType: "attachment",
        entityId: record.id,
        details: { filename: record.originalName, parentType: entityType },
      });

      res.status(201).json({
        ...record,
        url: `${config.apiUrl.replace(/\/$/, "")}${relativePath}`,
      });
    } catch (e) {
      if (req.file) {
        fs.unlink(req.file.path, () => undefined);
      }
      next(e);
    }
  }
);

router.get("/", requirePermission("attachments", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const { entityType, entityId } = z
      .object({
        entityType: z.enum([
          "client",
          "quote",
          "intervention",
          "report",
          "invoice",
          "site_visit",
        ]),
        entityId: z.string().min(1),
      })
      .parse(req.query);

    const mapped = entityTypeMap[entityType];
    const clientId = await assertEntityExists(mapped, entityId);

    if (
      req.user!.role === "CLIENT" &&
      clientId &&
      clientId !== req.user!.clientId
    ) {
      throw new NotFoundError();
    }

    const attachments = await prisma.attachment.findMany({
      where: { entityType: mapped, entityId },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      attachments.map((a) => ({
        ...a,
        url: `${config.apiUrl.replace(/\/$/, "")}${a.path}`,
      }))
    );
  } catch (e) {
    next(e);
  }
});

router.delete(
  "/:id",
  requirePermission("attachments", "DELETE"),
  async (req: AuthRequest, res, next) => {
    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: paramId(req) },
      });
      if (!attachment) throw new NotFoundError();

      if (req.user!.role === "CLIENT") {
        if (attachment.clientId !== req.user!.clientId) {
          throw new NotFoundError();
        }
      }

      const filePath = path.join(
        config.upload.dir,
        attachment.path.replace(/^\/uploads\//, "")
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await prisma.attachment.delete({ where: { id: attachment.id } });

      await logActivity({
        userId: req.user!.userId,
        clientId: attachment.clientId ?? undefined,
        action: "DELETE",
        entityType: "attachment",
        entityId: attachment.id,
      });

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
