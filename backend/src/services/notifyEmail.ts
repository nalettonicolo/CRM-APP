import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";

/** Destinatario notifiche (contatti, lead): company.email → NOTIFY_EMAIL → SMTP_FROM */
export async function getNotificationEmail(): Promise<string> {
  try {
    const company = await prisma.setting.findUnique({ where: { key: "company" } });
    const email =
      company?.value &&
      typeof company.value === "object" &&
      !Array.isArray(company.value)
        ? (company.value as Record<string, unknown>).email
        : undefined;
    if (typeof email === "string" && email.trim()) {
      return email.trim();
    }
  } catch {
    /* ignore */
  }

  const notify = process.env.NOTIFY_EMAIL?.trim();
  if (notify) return notify;

  const from = process.env.SMTP_FROM?.trim() || config.smtp.from?.trim();
  if (from) return from;

  return config.admin.email;
}
