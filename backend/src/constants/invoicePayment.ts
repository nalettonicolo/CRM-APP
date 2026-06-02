/** Metodi e termini di pagamento per documenti di cortesia (PDF / UI). */

export const INVOICE_PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "CASH",
  "CARD",
  "PAYPAL",
  "OTHER",
] as const;

export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number];

export const INVOICE_PAYMENT_TIMINGS = [
  "END_OF_WORK",
  "DAYS_15",
  "DAYS_30",
  "DAYS_60",
  "ON_RECEIPT",
  "AT_SIGNATURE",
] as const;

export type InvoicePaymentTiming = (typeof INVOICE_PAYMENT_TIMINGS)[number];

const METHOD_PDF: Record<InvoicePaymentMethod, string> = {
  BANK_TRANSFER: "Pagamento tramite bonifico bancario",
  CASH: "Pagamento in contanti",
  CARD: "Pagamento con carta",
  PAYPAL: "Pagamento tramite PayPal",
  OTHER: "Altro metodo di pagamento",
};

/** Testo compatto per riga PDF affiancata a Scadenza */
const METHOD_PDF_COMPACT: Record<InvoicePaymentMethod, string> = {
  BANK_TRANSFER: "Bonifico bancario",
  CASH: "Contanti",
  CARD: "Carta",
  PAYPAL: "PayPal",
  OTHER: "Altro",
};

const TIMING_PDF: Record<InvoicePaymentTiming, string> = {
  END_OF_WORK: "a fine lavori",
  DAYS_15: "entro 15 giorni",
  DAYS_30: "entro 30 giorni",
  DAYS_60: "entro 60 giorni",
  ON_RECEIPT: "a ricevimento del documento",
  AT_SIGNATURE: "all'accettazione del preventivo",
};

export function formatInvoicePaymentTermsPdf(
  input: {
    paymentMethod?: string | null;
    paymentTiming?: string | null;
  },
  compact = false
): string {
  const methods = compact ? METHOD_PDF_COMPACT : METHOD_PDF;
  const methodKey = (input.paymentMethod as InvoicePaymentMethod) || "BANK_TRANSFER";
  const method = methods[methodKey] ?? methods.BANK_TRANSFER;
  const timingKey = (input.paymentTiming as InvoicePaymentTiming) || "END_OF_WORK";
  const timing = TIMING_PDF[timingKey];
  return timing ? `${method} — ${timing}` : method;
}

export function formatInvoicePaymentPdfLine(
  input: {
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    paymentTiming?: string | null;
  },
  compact = false
): string {
  const terms = formatInvoicePaymentTermsPdf(input, compact);
  switch (input.paymentStatus) {
    case "PAID":
      return "Pagato";
    case "PARTIAL":
      return `Parzialmente pagato — ${terms}`;
    case "OVERDUE":
      return terms;
    case "UNPAID":
    default:
      return terms;
  }
}
