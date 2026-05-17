import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();

router.get("/public", async (_req, res, next) => {
  try {
    const items = await prisma.eventGalleryItem.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
      take: 24,
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.use(authenticate, adminOnly);

router.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.eventGalleryItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = z
      .object({
        title: z.string().optional(),
        caption: z.string().optional(),
        eventDate: z.string().datetime().optional().nullable(),
        imagePath: z.string().min(1),
        isPublished: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);

    const item = await prisma.eventGalleryItem.create({
      data: {
        title: data.title,
        caption: data.caption,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        imagePath: data.imagePath,
        isPublished: data.isPublished ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = paramId(req);
    const data = z
      .object({
        title: z.string().optional().nullable(),
        caption: z.string().optional().nullable(),
        eventDate: z.string().datetime().optional().nullable(),
        imagePath: z.string().optional(),
        isPublished: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);

    const existing = await prisma.eventGalleryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();

    const item = await prisma.eventGalleryItem.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.caption !== undefined ? { caption: data.caption } : {}),
        ...(data.eventDate !== undefined
          ? { eventDate: data.eventDate ? new Date(data.eventDate) : null }
          : {}),
        ...(data.imagePath !== undefined ? { imagePath: data.imagePath } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.eventGalleryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    await prisma.eventGalleryItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
