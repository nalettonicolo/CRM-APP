import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
};

/** Password app Gmail: rimuove spazi accidentalmente copiati. */
export function normalizeSmtpSecret(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/\s+/g, "");
}

function fromRecord(raw: Record<string, unknown> | null): Partial<SmtpConfig> {
  if (!raw) return {};
  return {
    host: typeof raw.host === "string" ? raw.host : undefined,
    port: raw.port != null ? Number(raw.port) : undefined,
    secure:
      raw.secure === true ||
      raw.secure === "true" ||
      (typeof raw.secure === "string" && raw.secure === "true"),
    user: typeof raw.user === "string" ? raw.user : undefined,
    pass: typeof raw.pass === "string" ? raw.pass : undefined,
    from: typeof raw.from === "string" ? raw.from : undefined,
    fromName: typeof raw.fromName === "string" ? raw.fromName : undefined,
  };
}

/** Impostazioni SMTP: database (chiave `smtp`) con fallback su variabili .env */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  let db: Partial<SmtpConfig> = {};
  try {
    const row = await prisma.setting.findUnique({ where: { key: "smtp" } });
    if (row?.value && typeof row.value === "object" && !Array.isArray(row.value)) {
      db = fromRecord(row.value as Record<string, unknown>);
    }
  } catch {
    /* DB non pronto */
  }

  const pass = normalizeSmtpSecret(db.pass || config.smtp.pass);
  const user = (db.user || config.smtp.user || "").trim();
  const from = (db.from || config.smtp.from || user || "").trim();

  return {
    host: (db.host || config.smtp.host || "").trim(),
    port: db.port ?? config.smtp.port,
    secure: db.secure ?? config.smtp.secure,
    user,
    pass,
    from,
    fromName: (db.fromName || config.smtp.fromName || "CRM Gestionale").trim(),
  };
}

export function isSmtpConfigured(smtp: SmtpConfig): boolean {
  return Boolean(smtp.host && smtp.user && smtp.pass && (smtp.from || smtp.user));
}
