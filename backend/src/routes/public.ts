import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sendEmail, emailTemplate } from "../services/email.js";
import { getNotificationEmail } from "../services/notifyEmail.js";
import { logActivity } from "../services/activityLog.js";

const router = Router();

router.post("/contact", async (req, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        company: z.string().optional(),
        message: z.string().min(1),
        services: z.array(z.string().min(1)).optional(),
        eventDateFrom: z.string().optional(),
        eventDateTo: z.string().optional(),
      })
      .parse(req.body);

    const parseDay = (s?: string) => {
      if (!s?.trim()) return undefined;
      const d = new Date(`${s.trim()}T12:00:00`);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const eventDateFrom = parseDay(data.eventDateFrom);
    const eventDateTo = parseDay(data.eventDateTo);

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        message: data.message,
        services: data.services ?? [],
        eventDateFrom,
        eventDateTo,
        source: "website",
      },
    });

    let emailSent = false;
    let emailWarning: string | undefined;
    try {
      const notifyTo = await getNotificationEmail();
      const result = await sendEmail({
        to: notifyTo,
        subject: `Nuova richiesta contatto: ${data.name}`,
        html: emailTemplate(
          "Nuova richiesta contatto",
          `<p><strong>${data.name}</strong> (${data.email})</p>
           ${data.phone ? `<p>Tel: ${data.phone}</p>` : ""}
           <p>${data.company || ""}</p>
           ${
             eventDateFrom
               ? `<p><strong>Date evento:</strong> ${eventDateFrom.toLocaleDateString("it-IT")}${
                   eventDateTo
                     ? ` → ${eventDateTo.toLocaleDateString("it-IT")}`
                     : ""
                 }</p>`
               : ""
           }
           ${data.services?.length ? `<p><strong>Servizi:</strong> ${data.services.join(", ")}</p>` : ""}
           <p>${data.message}</p>
           <p><a href="mailto:${data.email}">Rispondi al cliente</a></p>`,
          "Nicolò Service"
        ),
      });
      emailSent = !result.mock;
      if (result.mock) {
        emailWarning =
          "Richiesta salvata ma email non inviata: configura SMTP sul server.";
      }
    } catch (mailErr) {
      console.error("[contact] email failed:", mailErr);
      emailWarning =
        mailErr instanceof Error
          ? mailErr.message
          : "Invio email non riuscito";
    }

    res.status(201).json({ success: true, id: lead.id, emailSent, emailWarning });
  } catch (e) {
    next(e);
  }
});

export default router;
