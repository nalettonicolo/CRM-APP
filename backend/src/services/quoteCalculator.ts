import { Decimal } from "@prisma/client/runtime/library";
import {
  type PaymentTermInput,
  paymentTermsTotals,
} from "./paymentTerms.js";

export interface QuoteItemInput {
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  discount?: number;
}

export interface QuoteTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
  depositAmount: number;
  balanceDue: number;
  withholdingTaxAmount: number;
  stampDutyAmount: number;
  netPayable: number;
}

export function calculateItemTotal(item: QuoteItemInput): number {
  const qty = item.quantity;
  const price = item.unitPrice;
  const discount = item.discount || 0;
  const lineTotal = qty * price * (1 - discount / 100);
  return Math.round(lineTotal * 100) / 100;
}

export function calculateQuoteTotals(
  items: QuoteItemInput[],
  options: {
    discountPercent?: number;
    discountAmount?: number;
    depositPercent?: number;
    depositAmount?: number;
    paymentTerms?: PaymentTermInput[];
    withholdingTaxPercent?: number;
    withholdingTaxAmount?: number;
    stampDutyAmount?: number;
  } = {}
): QuoteTotals {
  const subtotal = items.reduce((sum, i) => sum + calculateItemTotal(i), 0);

  let afterDiscount = subtotal;
  if (options.discountPercent) {
    afterDiscount -= subtotal * (options.discountPercent / 100);
  }
  if (options.discountAmount) {
    afterDiscount -= options.discountAmount;
  }
  afterDiscount = Math.max(0, Math.round(afterDiscount * 100) / 100);

  const vatAmount = items.reduce((sum, i) => {
    const lineTotal = calculateItemTotal(i);
    const vatRate = i.vatRate ?? 22;
    return sum + lineTotal * (vatRate / 100);
  }, 0);

  const total = Math.round((afterDiscount + vatAmount) * 100) / 100;

  let deposit: number;
  let balanceDue: number;

  if (options.paymentTerms && options.paymentTerms.length > 0) {
    const pt = paymentTermsTotals(total, options.paymentTerms);
    deposit = pt.depositAmount;
    balanceDue = pt.balanceDue;
  } else {
    deposit = options.depositAmount || 0;
    if (options.depositPercent) {
      deposit = total * (options.depositPercent / 100);
    }
    deposit = Math.round(deposit * 100) / 100;
    balanceDue = Math.round((total - deposit) * 100) / 100;
  }

  let withholding =
    options.withholdingTaxAmount != null && options.withholdingTaxAmount > 0
      ? options.withholdingTaxAmount
      : 0;
  if (
    withholding === 0 &&
    options.withholdingTaxPercent &&
    options.withholdingTaxPercent > 0
  ) {
    withholding = Math.round(afterDiscount * (options.withholdingTaxPercent / 100) * 100) / 100;
  }

  const stampDuty = Math.max(0, options.stampDutyAmount ?? 0);
  const netPayable = Math.round((total - withholding + stampDuty) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total,
    depositAmount: deposit,
    balanceDue,
    withholdingTaxAmount: withholding,
    stampDutyAmount: stampDuty,
    netPayable,
  };
}

export function toDecimal(value: number): Decimal {
  return new Decimal(value);
}
