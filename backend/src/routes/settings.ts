import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";
import {
  sendEmail,
  emailTemplate,
  clearSmtpCache,
  verifySmtpConnection,
} from "../services/email.js";
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
    const smtp = await getSmtpConfig();
    if (!isSmtpConfigured(smtp)) {
      throw new ValidationError(
        "SMTP non configurato. Compila host, utente, password app e mittente."
      );
    }

    await verifySmtpConnection();

    const result = await sendEmail({
      to,
      subject: "Test email — Nicolò Service CRM",
      html: emailTemplate(
        "Email di test",
        "<p>Se leggi questo messaggio, l'invio SMTP (Gmail) funziona correttamente.</p>",
        smtp.fromName
      ),
    });

    res.json({
      success: true,
      mock: result.mock === true,
      message: result.mock
        ? "SMTP non attivo: email simulata in log server"
        : "Email inviata",
    });
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
