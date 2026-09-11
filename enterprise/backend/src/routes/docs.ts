import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authenticate);

// Albero documenti (wiki): tutti i doc dell'org, il client li raggruppa per parentDocId.
router.get("/", requirePermission("docs", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const docs = await prisma.doc.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: {
        id: true,
        title: true,
        parentDocId: true,
        updatedAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requirePermission("docs", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const doc = await prisma.doc.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    if (!doc) throw new HttpError(404, "Documento non trovato");
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

const docSchema = z.object({
  title: z.string().min(1),
  contentHtml: z.string().optional(),
  parentDocId: z.string().optional(),
});

router.post("/", requirePermission("docs", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = docSchema.parse(req.body);
    const doc = await prisma.doc.create({
      data: {
        organizationId: req.auth!.organizationId,
        title: body.title,
        contentHtml: body.contentHtml ?? "",
        parentDocId: body.parentDocId,
        authorId: req.auth!.userId,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requirePermission("docs", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = docSchema.partial().parse(req.body);
    const result = await prisma.doc.updateMany({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      data: body,
    });
    if (result.count === 0) throw new HttpError(404, "Documento non trovato");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("docs", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    await prisma.doc.deleteMany({ where: { id: req.params.id, organizationId: req.auth!.organizationId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
