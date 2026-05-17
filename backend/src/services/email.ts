import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSmtpConfig, isSmtpConfigured, type SmtpConfig } from "./smtpConfig.js";

let cached: { smtp: SmtpConfig; transporter: Transporter } | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

async function getTransporter(): Promise<{
  transporter: Transporter | null;
  smtp: SmtpConfig;
}> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) {
    return { transporter: cached.transporter, smtp: cached.smtp };
  }

  const smtp = await getSmtpConfig();
  if (!isSmtpConfigured(smtp)) {
    cached = null;
    return { transporter: null, smtp };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    ...(smtp.port === 587 && !smtp.secure
      ? { requireTLS: true }
      : {}),
  });

  cached = { smtp, transporter };
  cachedAt = now;
  return { transporter, smtp };
}

/** Dopo salvataggio SMTP da impostazioni, forza ricarica. */
export function clearSmtpCache() {
  cached = null;
  cachedAt = 0;
}

export type SendEmailResult =
  | { success: true; mock: true }
  | { success: true; mock: false };

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path?: string; content?: Buffer }[];
}): Promise<SendEmailResult> {
  const { transporter, smtp } = await getTransporter();

  if (!transporter) {
    console.warn(
      "[Email] SMTP non configurato — messaggio non inviato:",
      options.to,
      options.subject
    );
    return { success: true, mock: true };
  }

  try {
    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    return { success: true, mock: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email] Invio fallito:", msg);
    throw new Error(
      `Invio email fallito: ${msg}. Verifica SMTP (Gmail: password per le app, porta 587, secure disattivato).`
    );
  }
}

/** Verifica credenziali SMTP (usato dal test in impostazioni). */
export async function verifySmtpConnection(): Promise<void> {
  const { transporter, smtp } = await getTransporter();
  if (!transporter) {
    throw new Error(
      "SMTP non configurato. Imposta host, utente, password app e mittente nel .env o in Impostazioni."
    );
  }
  try {
    await transporter.verify();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Connessione SMTP fallita (${smtp.host}:${smtp.port}): ${msg}`);
  }
}

export function emailTemplate(title: string, body: string, brandName = "CRM") {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#f4f4f5;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <h1 style="color:#18181b;font-size:20px;margin:0 0 16px">${brandName}</h1>
    <h2 style="color:#3f3f46;font-size:16px;font-weight:500">${title}</h2>
    <div style="color:#52525b;line-height:1.6;margin-top:16px">${body}</div>
    <p style="color:#a1a1aa;font-size:12px;margin-top:32px">Email automatica — non rispondere</p>
  </div>
</body></html>`;
}
