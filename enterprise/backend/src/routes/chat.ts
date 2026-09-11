import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authenticate);

// Canali dell'organizzazione a cui l'utente partecipa (o pubblici).
router.get("/channels", requirePermission("chat", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const channels = await prisma.chatChannel.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        OR: [{ isPrivate: false }, { members: { some: { userId: req.auth!.userId } } }],
      },
      include: { _count: { select: { members: true, messages: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(channels);
  } catch (err) {
    next(err);
  }
});

const createChannelSchema = z.object({ name: z.string().min(1), isPrivate: z.boolean().optional() });

router.post("/channels", requirePermission("chat", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = createChannelSchema.parse(req.body);
    const channel = await prisma.chatChannel.create({
      data: {
        organizationId: req.auth!.organizationId,
        name: body.name,
        isPrivate: body.isPrivate ?? false,
        members: { create: [{ userId: req.auth!.userId }] },
      },
    });
    res.status(201).json(channel);
  } catch (err) {
    next(err);
  }
});

router.get("/channels/:id/messages", requirePermission("chat", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const channel = await prisma.chatChannel.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!channel) throw new HttpError(404, "Canale non trovato");
    const messages = await prisma.chatMessage.findMany({
      where: { channelId: channel.id },
      include: { author: { select: { firstName: true, lastName: true, avatarColor: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

const messageSchema = z.object({ body: z.string().min(1) });

router.post("/channels/:id/messages", requirePermission("chat", "WRITE"), async (req: AuthRequest, res, next) => {
  try {
    const body = messageSchema.parse(req.body);
    const channel = await prisma.chatChannel.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!channel) throw new HttpError(404, "Canale non trovato");
    const message = await prisma.chatMessage.create({
      data: { channelId: channel.id, authorId: req.auth!.userId, body: body.body },
      include: { author: { select: { firstName: true, lastName: true, avatarColor: true } } },
    });
    // NOTA: v1 è REST-only (polling lato client). Prossimo step: WebSocket/SSE
    // per push realtime senza refetch — vedi README "Roadmap".
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

export default router;
