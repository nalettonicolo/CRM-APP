import PDFDocument from "pdfkit";
import type {
  Client,
  Quote,
  QuoteItem,
  QuotePaymentTerm,
} from "@prisma/client";
import {
  drawPdfCourtesyFooter,
  drawPdfEventInfoRow,
  drawPdfLeftMetaClientRow,
  drawPdfLetterhead,
  drawPdfLineItemsTable,
  drawPdfNotesSectionLeft,
  drawPdfSignatureBlock,
  loadCompanySettings,
  loadLogoFilePath,
  pdfMoney,
  type CompanyInfo,
  type PdfFooterTotalLine,
} from "./pdfBranding.js";
import { formatSequentialDocumentNumber } from "./documentSequence.js";

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

    if (quote.notes?.trim()) {
      drawPdfNotesSectionLeft(doc, quote.notes);
    }

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

    const paymentTerms = quote.paymentTerms;
    if (paymentTerms && paymentTerms.length > 0) {
      for (const term of paymentTerms) {
        const pct =
          term.percent != null && Number(term.percent) > 0
            ? ` (${pdfMoney(term.percent)}%)`
            : "";
        const note = term.note?.trim() ? ` — ${term.note.trim()}` : "";
        totalLines.push({
          label: `${term.label}${pct}${note}`,
          value: `€ ${pdfMoney(Number(term.amount))}`,
        });
      }
      if (Number(quote.balanceDue) >= 0) {
        const hasBalanceRow = paymentTerms.some((t) => t.isBalance);
        if (!hasBalanceRow && Number(quote.balanceDue) > 0) {
          totalLines.push({
            label: "Saldo da versare",
            value: `€ ${pdfMoney(quote.balanceDue)}`,
            bold: true,
          });
        }
      }
    } else {
      const depPct = Number(quote.depositPercent);
      const depAmt = Number(quote.depositAmount);
      if (depPct > 0 || depAmt > 0) {
        const depLabel =
          depPct > 0 ? `Acconto (${pdfMoney(depPct)}%)` : "Acconto richiesto";
        totalLines.push(
          { label: depLabel, value: `€ ${pdfMoney(depAmt)}` },
          {
            label: "Saldo da versare",
            value: `€ ${pdfMoney(quote.balanceDue)}`,
            bold: true,
          }
        );
      }
    }

    const footerY = drawPdfCourtesyFooter(doc, companyInfo, { totalLines });
    doc.y = footerY + 8;
    doc.x = 50;

    drawPdfSignatureBlock(doc, {
      clientSignature: quote.clientSignature,
      signedAt: quote.signedAt,
    });

    doc.end();
  });
}
