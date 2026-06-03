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
  drawPdfCourtesyFooter,
  drawPdfEventInfoRow,
  drawPdfLeftMetaClientRow,
  drawPdfLetterhead,
  drawPdfLineItemsTable,
  drawPdfNotesSectionLeft,
  loadCompanySettings,
  loadLogoFilePath,
  pdfMoney,
  type CompanyInfo,
  type PdfFooterTotalLine,
  type PdfLineItem,
} from "./pdfBranding.js";
import { formatSequentialDocumentNumber } from "./documentSequence.js";

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

function displayInvoicePdfLabel(number: string | null | undefined): string {
  const normalized = formatSequentialDocumentNumber(number, { fallback: "BOZZA" });
  return `${DOCUMENT_COPY.invoice.pdfTitlePrefix} Doc. ${normalized}`;
}

async function generateInvoiceReceiptPdf(
  invoice: InvoiceWithRelations,
  company?: CompanyInfo
): Promise<Buffer> {
  const companyInfo = company ?? (await loadCompanySettings());
  const logoPath = await loadLogoFilePath();

  const displayNumber = invoice.number || `BOZZA-${invoice.id.slice(0, 6).toUpperCase()}`;
  const issueDate = invoice.confirmedAt ?? invoice.createdAt;
  const showQuoteReferences = invoice.showQuoteRef !== false;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const headerCompany =
      invoice.showWebsite === false ? { ...companyInfo, website: "" } : companyInfo;

    drawPdfLetterhead(doc, headerCompany, logoPath);

    const metaLines = [
      displayInvoicePdfLabel(displayNumber),
      `Data: ${issueDate.toLocaleDateString("it-IT")}`,
      invoice.dueDate
        ? `Scadenza: ${invoice.dueDate.toLocaleDateString("it-IT")}`
        : null,
      invoice.quote && showQuoteReferences
        ? `Rif. preventivo: ${formatSequentialDocumentNumber(invoice.quote.number)}`
        : null,
    ].filter(Boolean) as string[];

    drawPdfLeftMetaClientRow(doc, {
      metaLines,
      client: invoice.client,
    });

    drawPdfEventInfoRow(doc, {
      location: invoice.eventLocation ?? invoice.quote?.eventLocation,
      eventAt: invoice.eventAt ?? invoice.quote?.eventAt,
      eventEndAt: invoice.eventEndAt ?? invoice.quote?.eventEndAt,
    });

    drawPdfLineItemsTable(doc, invoiceItems(invoice));

    if (invoice.notes?.trim()) {
      drawPdfNotesSectionLeft(doc, invoice.notes);
    }

    const discounts = parseInvoiceDiscounts(invoice.discounts);
    const grossSubtotal = Number(invoice.subtotal);
    const totalLines: PdfFooterTotalLine[] = [
      { label: "Imponibile", value: `€ ${pdfMoney(grossSubtotal)}` },
    ];
    for (const discount of discounts) {
      const deduction = discountDeduction(grossSubtotal, discount);
      const label =
        discount.mode === "PERCENT"
          ? `${discount.description} (${discount.value}%)`
          : discount.description;
      totalLines.push({ label, value: `- € ${pdfMoney(deduction)}` });
    }
    totalLines.push(
      { label: "IVA", value: `€ ${pdfMoney(invoice.vatAmount)}` },
      { label: "Totale", value: `€ ${pdfMoney(invoice.total)}`, bold: true }
    );
    if (Number(invoice.depositAmount) > 0) {
      totalLines.push(
        { label: "Acconto", value: `€ ${pdfMoney(invoice.depositAmount)}` },
        { label: "Saldo", value: `€ ${pdfMoney(invoice.balanceDue)}`, bold: true }
      );
    }

    const disclaimerText =
      invoice.disclaimer?.trim() || INVOICE_COURTESY_DISCLAIMER;
    const disclaimerHeight = doc.heightOfString(disclaimerText, { width: 495 });

    const footerY = drawPdfCourtesyFooter(doc, companyInfo, {
      totalLines,
      paymentLineLeft: formatInvoicePaymentPdfLine(invoice, true),
      dueDateRight: invoice.dueDate
        ? invoice.dueDate.toLocaleDateString("it-IT")
        : null,
    }, { reserveBelow: disclaimerHeight + 14 });

    doc.y = footerY + 8;
    doc.x = 50;
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
