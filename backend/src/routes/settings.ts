import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";
import { clearSmtpCache } from "../services/email.js";
import { runEmailTest } from "../services/emailTests.js";
import {
  getSmtpConfig,
  isSmtpConfigured,
  normalizeSmtpSecret,
} from "../services/smtpConfig.js";
import { ValidationError } from "../utils/errors.js";
import { withAbsoluteAssetUrls } from "../utils/publicAssetUrl.js";

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
    "report_checklist_templates",
  ];
    const settings = await prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    const result: Record<string, unknown> = {};
    for (const s of settings) result[s.key] = s.value;
    res.json(withAbsoluteAssetUrls(result));
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

router.get("/smtp/status", async (_req, res, next) => {
  try {
    const smtp = await getSmtpConfig();
    const configured = isSmtpConfigured(smtp);
    res.json({
      configured,
      host: smtp.host || null,
      user: smtp.user || null,
      from: smtp.from || smtp.user || null,
      hasPassword: Boolean(smtp.pass),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/smtp/test", async (req, res, next) => {
  try {
    const { to } = z.object({ to: z.string().email() }).parse(req.body);
    const result = await runEmailTest("smtp", to);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/email-tests", async (req, res, next) => {
  try {
    const { to, type } = z
      .object({
        to: z.string().email(),
        type: z.enum(["smtp", "quote", "report", "invoice"]),
      })
      .parse(req.body);
    const result = await runEmailTest(type, to);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.put("/:key", async (req, res, next) => {
  try {
    let value = z.any().parse(req.body.value);
    const key = paramId(req, "key");

    if (key === "smtp" && value && typeof value === "object" && !Array.isArray(value)) {
      const incoming = value as Record<string, unknown>;
      const existing = await prisma.setting.findUnique({ where: { key: "smtp" } });
      const prev =
        existing?.value && typeof existing.value === "object" && !Array.isArray(existing.value)
          ? (existing.value as Record<string, unknown>)
          : {};

      const passRaw = typeof incoming.pass === "string" ? incoming.pass : "";
      const pass =
        passRaw.trim().length > 0
          ? normalizeSmtpSecret(passRaw)
          : normalizeSmtpSecret(
              typeof prev.pass === "string" ? prev.pass : undefined
            );

      const user =
        (typeof incoming.user === "string" ? incoming.user : prev.user) || "";
      const from =
        (typeof incoming.from === "string" ? incoming.from : prev.from) ||
        user;

      value = {
        ...prev,
        ...incoming,
        pass,
        from,
        user,
        port: incoming.port ?? prev.port ?? "587",
        host: incoming.host ?? prev.host ?? "smtp.gmail.com",
        secure:
          incoming.secure === true ||
          incoming.secure === "true" ||
          prev.secure === true,
      };
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    if (key === "smtp") clearSmtpCache();
    res.json(setting);
  } catch (e) {
    next(e);
  }
});

export default router;
