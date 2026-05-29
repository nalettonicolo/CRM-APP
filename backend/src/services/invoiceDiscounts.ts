import { z } from "zod";

export const invoiceDiscountSchema = z.object({
  description: z.string().min(1),
  mode: z.enum(["PERCENT", "AMOUNT"]),
  value: z.number().min(0),
});

export type InvoiceDiscount = z.infer<typeof invoiceDiscountSchema>;

export function parseInvoiceDiscounts(raw: unknown): InvoiceDiscount[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const parsed = invoiceDiscountSchema.safeParse(row);
      return parsed.success ? parsed.data : null;
    })
    .filter((row): row is InvoiceDiscount => row !== null);
}

export function discountDeduction(subtotal: number, discount: InvoiceDiscount): number {
  if (discount.mode === "PERCENT") {
    return Math.round(subtotal * (discount.value / 100) * 100) / 100;
  }
  return Math.round(discount.value * 100) / 100;
}

export function discountsFromQuote(quote: {
  discountPercent: unknown;
  discountAmount: unknown;
}): InvoiceDiscount[] {
  const rows: InvoiceDiscount[] = [];
  const percent = Number(quote.discountPercent);
  const amount = Number(quote.discountAmount);
  if (percent > 0) {
    rows.push({
      description: "Sconto percentuale",
      mode: "PERCENT",
      value: percent,
    });
  }
  if (amount > 0) {
    rows.push({
      description: "Sconto importo",
      mode: "AMOUNT",
      value: amount,
    });
  }
  return rows;
}
