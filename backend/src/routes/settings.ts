import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";
import { sendEmail, emailTemplate, clearSmtpCache } from "../services/email.js";
import { getSmtpConfig, isSmtpConfigured } from "../services/smtpConfig.js";
import { ValidationError } from "../utils/errors.js";

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

router.post("/smtp/test", async (req, res, next) => {
  try {
    const { to } = z.object({ to: z.string().email() }).parse(req.body);
    const smtp = await getSmtpConfig();
    if (!isSmtpConfigured(smtp)) {
      throw new ValidationError(
        "SMTP non configurato. Compila host, utente, password app e mittente."
      );
    }

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
    const value = z.any().parse(req.body.value);
    const key = paramId(req, "key");
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
