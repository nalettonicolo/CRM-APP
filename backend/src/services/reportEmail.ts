import { z } from "zod";
import { reportEmailBody } from "../constants/emailBodies.js";
import { sendEmail, emailTemplate, type SendEmailResult } from "./email.js";
import { generateReportPdf } from "./reportPdf.js";
import { loadCompanySettings } from "./quotePdf.js";
import { ValidationError } from "../utils/errors.js";

export type ReportEmailDispatchResult = SendEmailResult & {
  to: string;
};

export async function dispatchReportEmail(
  report: Parameters<typeof generateReportPdf>[0]
): Promise<ReportEmailDispatchResult> {
  const email = report.client.email?.trim();
  if (!email) {
    throw new ValidationError(
      "Il cliente non ha un indirizzo email. Aggiorna la scheda cliente."
    );
  }

  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    throw new ValidationError(
      "Email cliente non valida — aggiorna la scheda cliente"
    );
  }

  const company = await loadCompanySettings();
  const pdf = await generateReportPdf(report, company);
  const brandName =
    typeof company.name === "string" ? company.name : "Nicolò Service";

  const result = await sendEmail({
    to: email,
    subject: `Verbale di intervento ${report.number}`,
    html: emailTemplate(
      `Verbale di intervento ${report.number}`,
      reportEmailBody({ number: report.number }),
      brandName
    ),
    attachments: [
      {
        filename: `verbale-${report.number}.pdf`,
        content: pdf,
      },
    ],
  });

  if (result.mock) {
    throw new ValidationError(
      "SMTP non configurato: l'email non è stata inviata. Configura Gmail in Impostazioni → Email SMTP."
    );
  }

  return { ...result, to: email };
}
