import type { InvoiceDiscount, InvoiceLineItem, Report } from "@/lib/api";

export function emptyDiscount(): InvoiceDiscount {
  return { description: "", mode: "PERCENT", value: 0 };
}

export function parseInvoiceDiscounts(raw: unknown): InvoiceDiscount[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const r = row as Record<string, unknown>;
      const mode: InvoiceDiscount["mode"] =
        r.mode === "AMOUNT" ? "AMOUNT" : "PERCENT";
      return {
        description: String(r.description ?? "").trim(),
        mode,
        value: Math.max(0, Number(r.value) || 0),
      };
    })
    .filter((d) => d.description && d.value > 0);
}

export function discountDeduction(subtotal: number, discount: InvoiceDiscount): number {
  if (discount.mode === "PERCENT") {
    return Math.round(subtotal * (discount.value / 100) * 100) / 100;
  }
  return Math.round(discount.value * 100) / 100;
}

export function applyInvoiceDiscounts(
  subtotal: number,
  discounts: InvoiceDiscount[]
): { afterDiscount: number; totalDiscount: number } {
  let afterDiscount = subtotal;
  let totalDiscount = 0;
  for (const discount of discounts) {
    const deduction = discountDeduction(subtotal, discount);
    totalDiscount += deduction;
    afterDiscount -= deduction;
  }
  return {
    afterDiscount: Math.max(0, Math.round(afterDiscount * 100) / 100),
    totalDiscount: Math.round(totalDiscount * 100) / 100,
  };
}

export function calculateInvoiceTotals(
  items: InvoiceLineItem[],
  discounts: InvoiceDiscount[],
  depositAmount = 0
) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const vatAmount = items.reduce(
    (sum, item) => sum + (lineTotal(item) * parseDecimal(item.vatRate)) / 100,
    0
  );
  const { afterDiscount, totalDiscount } = applyInvoiceDiscounts(subtotal, discounts);
  const total = Math.round((afterDiscount + vatAmount) * 100) / 100;
  const deposit = Math.round(depositAmount * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalDiscount,
    afterDiscount,
    total,
    balanceDue: Math.max(0, Math.round((total - deposit) * 100) / 100),
  };
}

export function formatDiscountLabel(discount: InvoiceDiscount): string {
  if (discount.mode === "PERCENT") {
    return `${discount.description} (${discount.value}%)`;
  }
  return discount.description;
}

export function parseDecimal(value: number | string | undefined | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDecimal(value: number | string | undefined | null): string {
  return parseDecimal(value).toFixed(2).replace(".", ",");
}

export function lineTotal(item: InvoiceLineItem): number {
  return parseDecimal(item.quantity) * parseDecimal(item.unitPrice);
}

export function emptyLine(): InvoiceLineItem {
  return {
    description: "",
    quantity: 1,
    unit: "",
    unitPrice: "0,00",
    vatRate: "0,00",
    total: "0,00",
  };
}

export function linesFromQuote(items?: InvoiceLineItem[]): InvoiceLineItem[] {
  return (items ?? []).map((item) => ({
    description: item.description,
    quantity: Number(item.quantity) || 0,
    unit: item.unit || "",
    unitPrice: formatDecimal(item.unitPrice),
    vatRate: formatDecimal(item.vatRate ?? 0),
    total: formatDecimal(Number(item.total) || lineTotal(item)),
  }));
}

export function linesFromReport(report: Report): InvoiceLineItem[] {
  const rows: InvoiceLineItem[] = [];
  if (report.description?.trim()) {
    rows.push({
      description: `Report ${report.number} — ${report.description.trim()}`,
      quantity: 1,
      unit: "",
      unitPrice: "0,00",
      vatRate: "0,00",
      total: "0,00",
    });
  }
  for (const item of report.checklist ?? []) {
    if (!item.label?.trim()) continue;
    rows.push({
      description: `Report ${report.number} — ${item.label.trim()}`,
      quantity: 1,
      unit: "",
      unitPrice: "0,00",
      vatRate: "0,00",
      total: "0,00",
    });
  }
  for (const material of report.materials ?? []) {
    rows.push({
      description: `Materiale report ${report.number} — ${material.name}`,
      quantity: Number(material.quantity) || 0,
      unit: material.unit || "pz",
      unitPrice: "0,00",
      vatRate: "0,00",
      total: "0,00",
    });
  }
  if (Number(report.expensesAmount ?? 0) > 0 || report.expensesNotes?.trim()) {
    rows.push({
      description: `Costi report ${report.number}${report.expensesNotes ? ` — ${report.expensesNotes}` : ""}`,
      quantity: 1,
      unit: "",
      unitPrice: formatDecimal(report.expensesAmount ?? 0),
      vatRate: "0,00",
      total: formatDecimal(report.expensesAmount ?? 0),
    });
  }
  return rows;
}

export function dateInputToIso(value: string): string | undefined {
  return value ? `${value}T12:00:00.000Z` : undefined;
}
