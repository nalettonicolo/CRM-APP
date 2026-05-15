import nodemailer from "nodemailer";
import { config } from "../config/index.js";

const transporter =
  config.smtp.host && config.smtp.user
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      })
    : null;

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path?: string; content?: Buffer }[];
}) {
  if (!transporter) {
    console.log("[Email mock]", options.to, options.subject);
    return { success: true, mock: true };
  }

  await transporter.sendMail({
    from: `"${config.smtp.fromName}" <${config.smtp.from}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
  return { success: true };
}

export function emailTemplate(title: string, body: string, brandName = "CRM") {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#f4f4f5;padding:32px">
  <motion.div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <h1 style="color:#18181b;font-size:20px;margin:0 0 16px">${brandName}</h1>
    <h2 style="color:#3f3f46;font-size:16px;font-weight:500">${title}</h2>
    <motion.div style="color:#52525b;line-height:1.6;margin-top:16px">${body}</motion.div>
    <p style="color:#a1a1aa;font-size:12px;margin-top:32px">Email automatica — non rispondere</p>
  </motion.div>
</body></html>`;
}
