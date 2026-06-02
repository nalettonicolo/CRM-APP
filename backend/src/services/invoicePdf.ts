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

function paymentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "PAID":
      return "Pagato";
    case "PARTIAL":
      return "Parziale";
    case "OVERDUE":
      return "Scaduto";
    case "UNPAID":
    default:
      return "Non pagato";
  }
}

function displayInvoiceNumber(number: string | null | undefined): string {
  if (!number) return "BOZZA";
  if (number.startsWith("BOZZA")) return number;
  const normalized = number.replace(/^FPR-/, "");
  return `Doc. ${normalized}`;
}

async function generateInvoiceReceiptPdf(
  invoice: InvoiceWithRelations,
  company?: CompanyInfo
): Promise<Buffer> {
  const companyInfo = company ?? (await loadCompanySettings());
  const logoPath = await loadLogoFilePath();

  const displayNumber = invoice.number || `BOZZA-${invoice.id.slice(0, 6).toUpperCase()}`;
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

    drawPdfLetterhead(doc, headerCompany, logoPath);

    const rightHeaderX = 315;
    const rightHeaderWidth = 230;
    const rightHeaderTop = 52;
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#000000")
      .text(
        `${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${displayInvoiceNumber(displayNumber)}`,
        rightHeaderX,
        rightHeaderTop,
        { width: rightHeaderWidth, align: "right" }
      );
    doc.font("Helvetica").fontSize(10).fillColor("#52525b");
    let rightHeaderY = doc.y + 2;
    for (const line of subtitleRight) {
      doc.text(line, rightHeaderX, rightHeaderY, {
        width: rightHeaderWidth,
        align: "right",
      });
      rightHeaderY = doc.y + 1;
    }
    doc.fillColor("#000000");

    const clientName =
      invoice.client.companyName ||
      invoice.client.contactName ||
      [invoice.client.firstName, invoice.client.lastName]
        .filter(Boolean)
        .join(" ") ||
      "Cliente";
    const contactName = invoice.client.contactName?.trim();
    const referenceName =
      invoice.client.companyName && contactName && contactName !== clientName
        ? contactName
        : null;
    const clientLines = [
      invoice.client.address
        ? [
            invoice.client.address,
            invoice.client.postalCode,
            invoice.client.city,
            invoice.client.province,
          ]
            .filter(Boolean)
            .join(" ")
        : null,
      referenceName ? `Referente: ${referenceName}` : null,
      invoice.client.email || null,
      invoice.client.phone || null,
    ].filter(Boolean) as string[];

    const blockTop = Math.max(120, rightHeaderY + 10);
    const blockX = 300;
    const blockWidth = 245;
    doc.font("Helvetica-Bold").fontSize(11).text("Cliente", blockX, blockTop, {
      width: blockWidth,
      align: "right",
      underline: true,
    });
    doc.font("Helvetica-Bold").fontSize(12).text(clientName, blockX, doc.y + 2, {
      width: blockWidth,
      align: "right",
    });
    doc.font("Helvetica").fontSize(10);
    for (const line of clientLines) {
      doc.text(line, blockX, doc.y + 1, { width: blockWidth, align: "right" });
    }
    const clientBottom = doc.y + 2;

    doc.font("Helvetica").fontSize(9).fillColor("#52525b");
    doc.text(
      `${DOCUMENT_COPY.invoice.pdfTitlePrefix} ${displayInvoiceNumber(displayNumber)}`,
      50,
      clientBottom,
      { width: 230, align: "left" }
    );
    doc.fillColor("#000000");
    doc.y = clientBottom + 22;

    if (invoice.quote && showQuoteReferences) {
      if (doc.y < blockTop + 86) doc.y = blockTop + 86;
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
        const descHeight = doc.heightOfString(item.description, { width: 250 });
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
        const rowHeight = Math.max(descHeight, 14);
        doc.y = y + rowHeight + 6;
      }
      doc.moveDown();
    }

    if (invoice.notes?.trim()) {
      doc.fillColor("#52525b").fontSize(9).text("Note", { underline: true });
      doc.fillColor("#111827").fontSize(9).text(invoice.notes.trim(), {
        width: 495,
      });
      doc.moveDown(0.6);
    }

    const totalsX = 375;
    const addTotalLine = (label: string, value: string, y: number, bold = false) => {
      if (bold) doc.font("Helvetica-Bold");
      doc.fontSize(10).text(label, totalsX, y, { continued: true });
      doc.text(value, { align: "right" });
      if (bold) doc.font("Helvetica");
      return doc.y;
    };

    const discounts = parseInvoiceDiscounts(invoice.discounts);
    const grossSubtotal = Number(invoice.subtotal);
    const summaryHeight =
      118 + discounts.length * 16 + (Number(invoice.depositAmount) > 0 ? 28 : 0);
    const summaryY = Math.max(doc.y + 10, doc.page.height - summaryHeight - 52);

    let cursorY = summaryY;
    cursorY = addTotalLine("Imponibile", `€ ${money(grossSubtotal)}`, cursorY);
    for (const discount of discounts) {
      const deduction = discountDeduction(grossSubtotal, discount);
      const label =
        discount.mode === "PERCENT"
          ? `${discount.description} (${discount.value}%)`
          : discount.description;
      cursorY = addTotalLine(label, `- € ${money(deduction)}`, cursorY);
    }
    cursorY = addTotalLine("IVA", `€ ${money(invoice.vatAmount)}`, cursorY);
    cursorY = addTotalLine("Totale", `€ ${money(invoice.total)}`, cursorY, true);
    if (Number(invoice.depositAmount) > 0) {
      cursorY = addTotalLine("Acconto", `€ ${money(invoice.depositAmount)}`, cursorY);
      cursorY = addTotalLine("Saldo", `€ ${money(invoice.balanceDue)}`, cursorY, true);
    }

    doc.moveTo(50, cursorY + 6).lineTo(545, cursorY + 6).strokeColor("#e4e4e7").stroke();
    cursorY += 12;
    cursorY = addTotalLine(
      "Pagamento",
      paymentStatusLabel(invoice.paymentStatus),
      cursorY
    );
    cursorY = addTotalLine(
      "Scadenza",
      invoice.dueDate ? invoice.dueDate.toLocaleDateString("it-IT") : "—",
      cursorY
    );

    const bankTop = summaryY;
    doc.y = bankTop;
    drawPdfBankDetails(doc, companyInfo);
    const footerY = Math.max(doc.y + 4, cursorY + 6);
    doc.y = footerY;
    doc
      .fontSize(7.5)
      .fillColor("#71717a")
      .text(invoice.disclaimer?.trim() || INVOICE_COURTESY_DISCLAIMER, {
        width: 500,
      });

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
