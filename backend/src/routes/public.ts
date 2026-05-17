import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sendEmail, emailTemplate } from "../services/email.js";
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
        message: z.string().min(10),
        services: z.array(z.string().min(1)).optional(),
      })
      .parse(req.body);

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        message: data.message,
        services: data.services ?? [],
        source: "website",
      },
    });

    await sendEmail({
      to: process.env.SMTP_FROM || "admin@crm.local",
      subject: `Nuova richiesta contatto: ${data.name}`,
      html: emailTemplate(
        "Nuova richiesta contatto",
        `<p><strong>${data.name}</strong> (${data.email})</p>
         <p>${data.company || ""}</p>
         ${data.services?.length ? `<p><strong>Servizi:</strong> ${data.services.join(", ")}</p>` : ""}
         <p>${data.message}</p>`
      ),
    });

    res.status(201).json({ success: true, id: lead.id });
  } catch (e) {
    next(e);
  }
});

export default router;
