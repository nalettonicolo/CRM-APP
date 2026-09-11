import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("whiteboards", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const boards = await prisma.whiteboard.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(boards);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requirePermission("whiteboards", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const board = await prisma.whiteboard.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!board) throw new HttpError(404, "Whiteboard non trovata");
    res.json(board);
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("whiteboards", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ title: z.string().min(1) }).parse(req.body);
    const board = await prisma.whiteboard.create({
      data: { organizationId: req.auth!.organizationId, title: body.title },
    });
    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

// Salva l'intero stato degli elementi (shape/frecce/note) come JSON.
// v1: salvataggio esplicito dal client; realtime collaborativo è roadmap.
const saveSchema = z.object({ elementsJson: z.array(z.record(z.any())) });

router.put("/:id", requirePermission("whiteboards", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = saveSchema.parse(req.body);
    const result = await prisma.whiteboard.updateMany({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      data: { elementsJson: body.elementsJson },
    });
    if (result.count === 0) throw new HttpError(404, "Whiteboard non trovata");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
