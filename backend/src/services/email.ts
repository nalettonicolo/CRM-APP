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

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path?: string; content?: Buffer }[];
}) {
  const { transporter, smtp } = await getTransporter();

  if (!transporter) {
    console.log("[Email mock]", options.to, options.subject);
    return { success: true, mock: true as const };
  }

  await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.from}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
  return { success: true, mock: false as const };
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
