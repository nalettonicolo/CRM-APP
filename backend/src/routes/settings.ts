import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";

const router = Router();

router.get("/public", async (_req, res, next) => {
  try {
    const keys = [
    "app_name",
    "logo",
    "colors",
    "favicon",
    "footer",
    "company",
    "site_home",
  ];
    const settings = await prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    const result: Record<string, unknown> = {};
    for (const s of settings) result[s.key] = s.value;
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.use(authenticate, adminOnly);

router.get("/", async (_req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const result: Record<string, unknown> = {};
    for (const s of settings) result[s.key] = s.value;
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.put("/:key", async (req, res, next) => {
  try {
    const value = z.any().parse(req.body.value);
    const setting = await prisma.setting.upsert({
      where: { key: paramId(req, "key") },
      create: { key: paramId(req, "key"), value },
      update: { value },
    });
    res.json(setting);
  } catch (e) {
    next(e);
  }
});

export default router;
