import PDFDocument from "pdfkit";
import type {
  Client,
  Quote,
  QuoteItem,
  QuotePaymentTerm,
} from "@prisma/client";
import {
  alignPdfClosingToPageBottom,
  drawPdfCourtesyFooter,
  drawPdfEventInfoRow,
  drawPdfLeftMetaClientRow,
  drawPdfLetterhead,
  drawPdfLineItemsTable,
  drawPdfNotesSectionLeft,
  drawPdfPaymentScheduleSection,
  drawPdfSignatureBlock,
  estimateCourtesyFooterHeight,
  estimateSignatureBlockHeight,
  loadCompanySettings,
  loadLogoFilePath,
  PDF_LAYOUT,
  pdfMoney,
  type CompanyInfo,
  type PdfFooterTotalLine,
  type PdfPaymentScheduleLine,
} from "./pdfBranding.js";
import { formatInvoicePaymentPdfLine } from "../constants/invoicePayment.js";
import { formatSequentialDocumentNumber } from "./documentSequence.js";

function quotePdfDueDate(
  quote: Quote & { paymentTerms?: QuotePaymentTerm[] }
): string | null {
  if (quote.validUntil) {
    return quote.validUntil.toLocaleDateString("it-IT");
  }
  const balanceTerm = quote.paymentTerms?.find((t) => t.isBalance && t.dueDate);
  if (balanceTerm?.dueDate) {
    return balanceTerm.dueDate.toLocaleDateString("it-IT");
  }
  return null;
}

function buildQuotePaymentScheduleLines(
  quote: Quote & { paymentTerms?: QuotePaymentTerm[] }
): PdfPaymentScheduleLine[] {
  const lines: PdfPaymentScheduleLine[] = [];
  const paymentTerms = quote.paymentTerms;

  if (paymentTerms && paymentTerms.length > 0) {
    for (const term of paymentTerms) {
      const pct =
        term.percent != null && Number(term.percent) > 0
          ? ` (${pdfMoney(term.percent)}%)`
          : "";
      const note = term.note?.trim() ? ` — ${term.note.trim()}` : "";
      lines.push({
        label: `${term.label}${pct}${note}`,
        amount: `€ ${pdfMoney(Number(term.amount))}`,
      });
    }
    const hasBalanceRow = paymentTerms.some((t) => t.isBalance);
    if (!hasBalanceRow && Number(quote.balanceDue) > 0) {
      lines.push({
        label: "Saldo da versare",
        amount: `€ ${pdfMoney(quote.balanceDue)}`,
      });
    }
    return lines;
  }

  const depPct = Number(quote.depositPercent);
  const depAmt = Number(quote.depositAmount);
  if (depPct > 0 || depAmt > 0) {
    const depLabel =
      depPct > 0 ? `Acconto (${pdfMoney(depPct)}%)` : "Acconto richiesto";
    lines.push(
      { label: depLabel, amount: `€ ${pdfMoney(depAmt)}` },
      { label: "Saldo da versare", amount: `€ ${pdfMoney(quote.balanceDue)}` }
    );
  }

  return lines;
}

function buildQuoteFooterTotalLines(quote: Quote): PdfFooterTotalLine[] {
  const totalLines: PdfFooterTotalLine[] = [
    { label: "Imponibile", value: `€ ${pdfMoney(quote.subtotal)}` },
  ];
  if (Number(quote.discountAmount) > 0) {
    totalLines.push({
      label: "Sconto",
      value: `- € ${pdfMoney(quote.discountAmount)}`,
    });
  }
  totalLines.push(
    { label: "IVA", value: `€ ${pdfMoney(quote.vatAmount)}` },
    { label: "Totale", value: `€ ${pdfMoney(quote.total)}`, bold: true }
  );
  if (Number(quote.withholdingTaxAmount) > 0) {
    const pct = Number(quote.withholdingTaxPercent);
    const label =
      pct > 0
        ? `Ritenuta d'acconto (${pdfMoney(pct)}%)`
        : "Ritenuta d'acconto";
    totalLines.push({ label, value: `- € ${pdfMoney(quote.withholdingTaxAmount)}` });
  }
  if (Number(quote.stampDutyAmount) > 0) {
    totalLines.push({
      label: "Marca da bollo",
      value: `€ ${pdfMoney(quote.stampDutyAmount)}`,
    });
  }
  if (
    Number(quote.netPayable) > 0 &&
    Number(quote.netPayable) !== Number(quote.total)
  ) {
    totalLines.push({
      label: "Netto a pagare",
      value: `€ ${pdfMoney(quote.netPayable)}`,
      bold: true,
    });
  }
  return totalLines;
}

export { loadCompanySettings };

export async function generateQuotePdf(
  quote: Quote & {
    items: QuoteItem[];
    paymentTerms?: QuotePaymentTerm[];
    client: Client;
    clientSignature?: string | null;
  },
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

    drawPdfLetterhead(doc, companyInfo, logoPath);

    const metaLines = [
      `Preventivo ${formatSequentialDocumentNumber(quote.number)}`,
      `Data: ${quote.createdAt.toLocaleDateString("it-IT")}`,
      quote.validUntil
        ? `Offerta valida fino al: ${quote.validUntil.toLocaleDateString("it-IT")}`
        : null,
      quote.title?.trim() ? `Oggetto: ${quote.title.trim()}` : null,
    ].filter(Boolean) as string[];

    drawPdfLeftMetaClientRow(doc, {
      metaLines,
      client: quote.client,
    });

    drawPdfEventInfoRow(doc, {
      location: quote.eventLocation,
      eventAt: quote.eventAt,
      eventEndAt: quote.eventEndAt,
    });

    drawPdfLineItemsTable(doc, quote.items);

    drawPdfPaymentScheduleSection(doc, buildQuotePaymentScheduleLines(quote));

    if (quote.notes?.trim()) {
      drawPdfNotesSectionLeft(doc, quote.notes);
    }

    const footerInput = {
      totalLines: buildQuoteFooterTotalLines(quote),
      paymentLineLeft: formatInvoicePaymentPdfLine(
        {
          paymentStatus: quote.paymentStatus,
          paymentMethod: quote.paymentMethod,
          paymentTiming: quote.paymentTiming,
        },
        true
      ),
      dueDateRight: quotePdfDueDate(quote),
    };
    const hasDigitalSig = Boolean(quote.clientSignature?.trim()?.startsWith("data:image"));
    const closingHeight =
      estimateCourtesyFooterHeight(companyInfo, footerInput) +
      estimateSignatureBlockHeight(hasDigitalSig) +
      6;

    alignPdfClosingToPageBottom(doc, closingHeight);

    drawPdfCourtesyFooter(doc, companyInfo, footerInput, {
      skipLeadingGap: true,
    });

    drawPdfSignatureBlock(doc, {
      clientSignature: quote.clientSignature,
      signedAt: quote.signedAt,
    });

    doc.end();
  });
}
