import { prisma } from "../lib/prisma.js";
import { DOCUMENT_COPY } from "../constants/documentCopy.js";
import {
  invoiceEmailBodyTest,
  quoteEmailBodyTest,
  reportEmailBodyTest,
} from "../constants/emailBodies.js";
import { sendEmail, emailTemplate, verifySmtpConnection } from "./email.js";
import { generateInvoicePdf } from "./invoicePdf.js";
import { generateQuotePdf } from "./quotePdf.js";
import { generateReportPdf } from "./reportPdf.js";
import { loadCompanySettings } from "./quotePdf.js";
import { getSmtpConfig, isSmtpConfigured } from "./smtpConfig.js";
import { ValidationError } from "../utils/errors.js";

export type EmailTestType = "smtp" | "quote" | "report" | "invoice";

const invoiceInclude = {
  client: true,
  quote: { include: { items: { orderBy: { sortOrder: "asc" as const } } } },
  attachments: { orderBy: { createdAt: "asc" as const } },
};

export async function runEmailTest(
  type: EmailTestType,
  to: string
): Promise<{ success: true; mock: boolean; message: string }> {
  const smtp = await getSmtpConfig();
  if (!isSmtpConfigured(smtp)) {
    throw new ValidationError(
      "SMTP non configurato. Compila host, utente, password app e mittente."
    );
  }

  await verifySmtpConnection();

  const company = await loadCompanySettings();
  const brandName =
    typeof company.name === "string" ? company.name : "Nicolò Service";

  if (type === "smtp") {
    const result = await sendEmail({
      to,
      subject: "[TEST] Email SMTP — Nicolò Service CRM",
      html: emailTemplate(
        "Test SMTP",
        "<p>Se leggi questo messaggio, la configurazione SMTP funziona.</p><p><em>Questo è un invio di prova dalle Impostazioni.</em></p>",
        brandName
      ),
    });
    return {
      success: true,
      mock: result.mock === true,
      message: result.mock
        ? "SMTP non attivo: email simulata in log server"
        : "Email SMTP di test inviata",
    };
  }

  if (type === "quote") {
    const quote = await prisma.quote.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!quote) {
      throw new ValidationError(
        "Nessun preventivo nel sistema: crea almeno un preventivo per testare questo invio."
      );
    }
    const pdf = await generateQuotePdf(quote, company);
    const result = await sendEmail({
      to,
      subject: `[TEST] Preventivo ${quote.number}`,
      html: emailTemplate(
        `[TEST] Preventivo ${quote.number}`,
        quoteEmailBodyTest({ number: quote.number, title: quote.title }),
        brandName
      ),
      attachments: [
        { filename: `preventivo-${quote.number}.pdf`, content: pdf },
      ],
    });
    return {
      success: true,
      mock: result.mock === true,
      message: result.mock
        ? `Test preventivo simulato (${quote.number})`
        : `Test preventivo inviato (${quote.number})`,
    };
  }

  if (type === "report") {
    const report = await prisma.interventionReport.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        materials: true,
        technician: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });
    if (!report) {
      throw new ValidationError(
        "Nessun verbale nel sistema: crea almeno un report per testare questo invio."
      );
    }
    const pdf = await generateReportPdf(report, company);
    const result = await sendEmail({
      to,
      subject: `[TEST] Verbale ${report.number}`,
      html: emailTemplate(
        `[TEST] Verbale ${report.number}`,
        reportEmailBodyTest({ number: report.number }),
        brandName
      ),
      attachments: [{ filename: `report-${report.number}.pdf`, content: pdf }],
    });
    return {
      success: true,
      mock: result.mock === true,
      message: result.mock
        ? `Test verbale simulato (${report.number})`
        : `Test verbale inviato (${report.number})`,
    };
  }

  const invoice = await prisma.invoicePreview.findFirst({
    orderBy: { createdAt: "desc" },
    include: invoiceInclude,
  });
  if (!invoice) {
    throw new ValidationError(
      "Nessun documento di cortesia: creane uno per testare questo invio."
    );
  }
  const pdf = await generateInvoicePdf(invoice, company);
  const result = await sendEmail({
    to,
    subject: `[TEST] ${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${invoice.number}`,
    html: emailTemplate(
      `[TEST] ${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${invoice.number}`,
      invoiceEmailBodyTest({ number: invoice.number }),
      brandName
    ),
    attachments: [
      { filename: `documento-${invoice.number}.pdf`, content: pdf },
    ],
  });
  return {
    success: true,
    mock: result.mock === true,
    message: result.mock
      ? `Test documento simulato (${invoice.number})`
      : `Test documento inviato (${invoice.number})`,
  };
}
