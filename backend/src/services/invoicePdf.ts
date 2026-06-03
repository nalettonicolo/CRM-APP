import PDFDocument from "pdfkit";
import type { Attachment, Client, InvoicePreview, Quote, QuoteItem } from "@prisma/client";
import { appendAttachmentsToInvoicePdf } from "./invoicePdfAttachments.js";
import { DOCUMENT_COPY, INVOICE_COURTESY_DISCLAIMER } from "../constants/documentCopy.js";
import {
  discountDeduction,
  parseInvoiceDiscounts,
} from "./invoiceDiscounts.js";
import { formatInvoicePaymentPdfLine } from "../constants/invoicePayment.js";
import {
  createPdfTotalsWriter,
  drawPdfBankDetails,
  drawPdfEventInfoRow,
  drawPdfHeaderClientRow,
  drawPdfLetterhead,
  drawPdfLineItemsTable,
  drawPdfNotesSection,
  loadCompanySettings,
  loadLogoFilePath,
  pdfMoney,
  type CompanyInfo,
  type PdfLineItem,
} from "./pdfBranding.js";

type InvoiceWithRelations = InvoicePreview & {
  client: Client;
  quote?: (Quote & { items?: QuoteItem[] }) | null;
  attachments?: Attachment[];
};

type MoneyLike = number | string | { toString(): string };

type InvoiceLineItem = {
  description: string;
  quantity: MoneyLike;
  unit?: string | null;
  unitPrice: MoneyLike;
  vatRate?: MoneyLike;
  total: MoneyLike;
};

function invoiceItems(invoice: InvoiceWithRelations): PdfLineItem[] {
  if (Array.isArray(invoice.items)) {
    return invoice.items
      .filter((item) => item && typeof item === "object" && "description" in item)
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          description: String(row.description || ""),
          quantity: Number(row.quantity) || 0,
          unit: typeof row.unit === "string" ? row.unit : null,
          unitPrice: Number(row.unitPrice) || 0,
          total: Number(row.total) || 0,
        };
      })
      .filter((item) => item.description.trim());
  }
  return (
    invoice.quote?.items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      total: item.total,
    })) ?? []
  );
}

function displayInvoiceNumber(number: string | null | undefined): string {
  if (!number) return "BOZZA";
  if (number.startsWith("BOZZA")) return number;
  const normalized = number.replace(/^FPR-/, "");
  return normalized;
}

async function generateInvoiceReceiptPdf(
  invoice: InvoiceWithRelations,
  company?: CompanyInfo
): Promise<Buffer> {
  const companyInfo = company ?? (await loadCompanySettings());
  const logoPath = await loadLogoFilePath();

  const displayNumber = invoice.number || `BOZZA-${invoice.id.slice(0, 6).toUpperCase()}`;
  const issueDate = invoice.confirmedAt ?? invoice.createdAt;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const showQuoteReferences = invoice.showQuoteRef !== false;
    const headerCompany =
      invoice.showWebsite === false ? { ...companyInfo, website: "" } : companyInfo;

    drawPdfLetterhead(doc, headerCompany, logoPath, {
      titleRight: `${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${displayInvoiceNumber(displayNumber)}`,
      subtitleRight: [`Emesso il: ${issueDate.toLocaleDateString("it-IT")}`],
    });

    const refLines = [
      invoice.quote?.title?.trim() && showQuoteReferences
        ? `Oggetto: ${invoice.quote.title.trim()}`
        : null,
      invoice.dueDate
        ? `Scadenza: ${invoice.dueDate.toLocaleDateString("it-IT")}`
        : null,
      invoice.quote && showQuoteReferences
        ? `Rif. preventivo: ${invoice.quote.number}`
        : null,
    ].filter(Boolean) as string[];

    drawPdfHeaderClientRow(doc, {
      referencesHeading: DOCUMENT_COPY.invoice.referencesHeading,
      referenceLines: refLines,
      client: invoice.client,
    });

    drawPdfEventInfoRow(doc, {
      location: invoice.eventLocation ?? invoice.quote?.eventLocation,
      eventAt: invoice.eventAt ?? invoice.quote?.eventAt,
      eventEndAt: invoice.eventEndAt ?? invoice.quote?.eventEndAt,
    });

    const items = invoiceItems(invoice);
    drawPdfLineItemsTable(doc, items);

    const addTotalLine = createPdfTotalsWriter(doc);
    const discounts = parseInvoiceDiscounts(invoice.discounts);
    const grossSubtotal = Number(invoice.subtotal);

    addTotalLine("Imponibile", `€ ${pdfMoney(grossSubtotal)}`);
    for (const discount of discounts) {
      const deduction = discountDeduction(grossSubtotal, discount);
      const label =
        discount.mode === "PERCENT"
          ? `${discount.description} (${discount.value}%)`
          : discount.description;
      addTotalLine(label, `- € ${pdfMoney(deduction)}`);
    }
    addTotalLine("IVA", `€ ${pdfMoney(invoice.vatAmount)}`);
    addTotalLine("Totale", `€ ${pdfMoney(invoice.total)}`, true);
    if (Number(invoice.depositAmount) > 0) {
      addTotalLine("Acconto", `€ ${pdfMoney(invoice.depositAmount)}`);
      addTotalLine("Saldo", `€ ${pdfMoney(invoice.balanceDue)}`, true);
    }

    const paymentLine = formatInvoicePaymentPdfLine(invoice, true);
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica-Bold").text(DOCUMENT_COPY.invoice.paymentHeading);
    doc.font("Helvetica");
    doc.moveDown(0.2);
    addTotalLine("Modalità", paymentLine);
    if (invoice.dueDate) {
      addTotalLine(
        "Scadenza",
        invoice.dueDate.toLocaleDateString("it-IT")
      );
    }

    drawPdfNotesSection(doc, invoice.notes);
    drawPdfBankDetails(doc, companyInfo);

    if (doc.y > 620) doc.addPage();
    doc.moveDown(0.5);
    const disclaimerText =
      invoice.disclaimer?.trim() || INVOICE_COURTESY_DISCLAIMER;
    doc
      .fontSize(7.5)
      .fillColor("#71717a")
      .text(disclaimerText, 50, doc.y, { width: 495, align: "left" });
    doc.fillColor("#000000");

    doc.end();
  });
}

export async function generateInvoicePdf(
  invoice: InvoiceWithRelations,
  company?: CompanyInfo
): Promise<Buffer> {
  const receipt = await generateInvoiceReceiptPdf(invoice, company);
  const attachments = [...(invoice.attachments ?? [])].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  return appendAttachmentsToInvoicePdf(receipt, attachments);
}
