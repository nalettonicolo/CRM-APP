import PDFDocument from "pdfkit";
import type { Attachment, Client, InvoicePreview, Quote, QuoteItem } from "@prisma/client";
import { appendAttachmentsToInvoicePdf } from "./invoicePdfAttachments.js";
import { DOCUMENT_COPY, INVOICE_COURTESY_DISCLAIMER } from "../constants/documentCopy.js";
import {
  discountDeduction,
  parseInvoiceDiscounts,
} from "./invoiceDiscounts.js";
import {
  drawPdfBankDetails,
  drawPdfLetterhead,
  loadCompanySettings,
  loadLogoFilePath,
  type CompanyInfo,
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

function invoiceItems(invoice: InvoiceWithRelations): InvoiceLineItem[] {
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
          vatRate: Number(row.vatRate) || 0,
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
      vatRate: item.vatRate,
      total: item.total,
    })) ?? []
  );
}

function money(n: number | { toString(): string }) {
  return Number(n).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function generateInvoiceReceiptPdf(
  invoice: InvoiceWithRelations,
  company?: CompanyInfo
): Promise<Buffer> {
  const companyInfo = company ?? (await loadCompanySettings());
  const logoPath = await loadLogoFilePath();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const subtitleRight = [
      `Data: ${invoice.createdAt.toLocaleDateString("it-IT")}`,
    ];
    if (invoice.dueDate) {
      subtitleRight.push(
        `Scadenza: ${invoice.dueDate.toLocaleDateString("it-IT")}`
      );
    }
    const showQuoteReferences = invoice.showQuoteRef !== false;
    if (invoice.quote && showQuoteReferences) {
      subtitleRight.push(`Rif. preventivo: ${invoice.quote.number}`);
    }

    const headerCompany =
      invoice.showWebsite === false ? { ...companyInfo, website: "" } : companyInfo;

    drawPdfLetterhead(doc, headerCompany, logoPath, {
      titleRight: `${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${invoice.number}`,
      subtitleRight,
    });

    const clientName =
      invoice.client.companyName ||
      invoice.client.contactName ||
      [invoice.client.firstName, invoice.client.lastName]
        .filter(Boolean)
        .join(" ") ||
      "Cliente";
    doc.fontSize(11).text("Cliente", { underline: true });
    doc.fontSize(10).text(clientName);
    if (invoice.client.address) {
      const addr = [
        invoice.client.address,
        invoice.client.postalCode,
        invoice.client.city,
        invoice.client.province,
      ]
        .filter(Boolean)
        .join(" ");
      doc.text(addr);
    }
    if (invoice.client.email) doc.text(invoice.client.email);
    if (invoice.client.phone) doc.text(invoice.client.phone);
    doc.moveDown();

    if (invoice.quote && showQuoteReferences) {
      doc.fontSize(11).text("Riferimenti documento", { underline: true });
      doc.fontSize(10).text(`Da preventivo: ${invoice.quote.number}`);
      if (invoice.quote.title?.trim()) {
        doc.text(`Oggetto: ${invoice.quote.title.trim()}`);
      }
      if (invoice.quote.eventAt) {
        const end = invoice.quote.eventEndAt ?? invoice.quote.eventAt;
        const sameDay =
          invoice.quote.eventAt.toDateString() === end.toDateString();
        const period = sameDay
          ? invoice.quote.eventAt.toLocaleDateString("it-IT")
          : `${invoice.quote.eventAt.toLocaleDateString("it-IT")} – ${end.toLocaleDateString("it-IT")}`;
        doc.text(`Periodo di servizio: ${period}`);
      }
      doc.moveDown();
    }

    const items = invoiceItems(invoice);
    if (items.length > 0) {
      const tableTop = doc.y;
      const colDesc = 50;
      const colQty = 320;
      const colPrice = 380;
      const colTotal = 480;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Descrizione", colDesc, tableTop);
      doc.text("Q.tà", colQty, tableTop, { width: 50, align: "right" });
      doc.text("Prezzo", colPrice, tableTop, { width: 70, align: "right" });
      doc.text("Totale", colTotal, tableTop, { width: 70, align: "right" });
      doc.font("Helvetica");
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e4e4e7").stroke();
      doc.moveDown(0.3);

      for (const item of items) {
        if (doc.y > 700) doc.addPage();
        const y = doc.y;
        doc.fontSize(9).text(item.description, colDesc, y, { width: 250 });
        const qtyText = item.unit
          ? `${money(item.quantity)} ${item.unit}`
          : money(item.quantity);
        doc.text(qtyText, colQty, y, { width: 50, align: "right" });
        doc.text(`€ ${money(item.unitPrice)}`, colPrice, y, {
          width: 70,
          align: "right",
        });
        doc.text(`€ ${money(item.total)}`, colTotal, y, {
          width: 70,
          align: "right",
        });
        doc.moveDown(0.8);
      }
      doc.moveDown();
    }

    const totalsX = 380;
    const addTotalLine = (label: string, value: string, bold = false) => {
      if (bold) doc.font("Helvetica-Bold");
      doc.fontSize(10).text(label, totalsX, doc.y, { continued: true });
      doc.text(value, { align: "right" });
      if (bold) doc.font("Helvetica");
    };

    const discounts = parseInvoiceDiscounts(invoice.discounts);
    const grossSubtotal = Number(invoice.subtotal);
    addTotalLine("Imponibile", `€ ${money(grossSubtotal)}`);
    for (const discount of discounts) {
      const deduction = discountDeduction(grossSubtotal, discount);
      const label =
        discount.mode === "PERCENT"
          ? `${discount.description} (${discount.value}%)`
          : discount.description;
      addTotalLine(label, `- € ${money(deduction)}`);
    }
    addTotalLine("IVA", `€ ${money(invoice.vatAmount)}`);
    addTotalLine("Totale", `€ ${money(invoice.total)}`, true);
    if (Number(invoice.depositAmount) > 0) {
      addTotalLine("Acconto", `€ ${money(invoice.depositAmount)}`);
      addTotalLine("Saldo", `€ ${money(invoice.balanceDue)}`, true);
    }

    drawPdfBankDetails(doc, companyInfo);

    doc.moveDown();
    doc
      .fontSize(8)
      .fillColor("#71717a")
      .text(invoice.disclaimer?.trim() || INVOICE_COURTESY_DISCLAIMER, {
        width: 500,
      });

    if (invoice.notes) {
      doc.moveDown();
      doc.fillColor("#52525b").fontSize(9).text("Note", { underline: true });
      doc.fillColor("#000000").text(invoice.notes);
    }

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
