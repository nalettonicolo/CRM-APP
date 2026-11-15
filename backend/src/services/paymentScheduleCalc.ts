/** Parte pura (senza database) dello scadenzario pagamenti. */
import type { PaymentStatus } from "@prisma/client";
import type { prisma } from "../lib/prisma.js";

export type ScheduleRowStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

export interface PaymentScheduleRow {
  id: string;
  quoteId: string;
  quoteNumber: string;
  quoteTitle: string | null;
  label: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  dueDate: string;
  status: ScheduleRowStatus;
}

export interface ClientDocumentRow {
  id: string;
  kind: "quote" | "invoice";
  number: string;
  title: string | null;
  total: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  href: string;
}

export interface ClientPaymentOverview {
  open: ClientDocumentRow[];
  closed: ClientDocumentRow[];
  schedule: PaymentScheduleRow[];
  summary: {
    openAmount: number;
    closedAmount: number;
    overdueCount: number;
    upcomingCount: number;
  };
}

type ClientNameFields = {
  companyName: string | null;
  contactName: string | null;
  firstName: string | null;
  lastName: string | null;
};

type QuotePaymentTermLike = {
  id: string;
  label: string;
  note: string | null;
  amount: unknown;
  isBalance: boolean;
  dueDate: Date | null;
};

export function clientDisplayName(c: ClientNameFields): string {
  return (
    c.companyName ||
    c.contactName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    "Cliente"
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function startOfDay(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function rowStatus(
  amount: number,
  paid: number,
  due: Date,
  now: Date = new Date()
): ScheduleRowStatus {
  if (amount <= 0) return "PAID";
  if (paid >= amount - 0.01) return "PAID";
  if (paid > 0.01) return "PARTIAL";
  if (due < startOfDay(now)) return "OVERDUE";
  return "PENDING";
}

export function defaultDueDate(quote: {
  acceptedAt: Date | null;
  eventAt: Date | null;
  validUntil: Date | null;
  createdAt: Date;
}): Date {
  return (
    quote.acceptedAt ??
    quote.eventAt ??
    quote.validUntil ??
    quote.createdAt
  );
}

function normalizedText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function isAcceptanceDepositTerm(term: QuotePaymentTermLike): boolean {
  if (term.isBalance || Number(term.amount) <= 0) return false;
  const text = normalizedText(`${term.label} ${term.note ?? ""}`);
  return text.includes("accettazione") || text.includes("accettaz");
}

export function allocatePaymentsToTerms(
  terms: { id: string; amount: number }[],
  payments: { id: string; quotePaymentTermId: string | null; amount: unknown }[]
): Map<string, number> {
  const paid = new Map<string, number>();
  for (const t of terms) paid.set(t.id, 0);

  for (const p of payments) {
    const amt = Number(p.amount);
    if (p.quotePaymentTermId && paid.has(p.quotePaymentTermId)) {
      paid.set(
        p.quotePaymentTermId,
        round2((paid.get(p.quotePaymentTermId) ?? 0) + amt)
      );
    }
  }

  let unallocated = payments
    .filter((p) => !p.quotePaymentTermId)
    .reduce((s, p) => s + Number(p.amount), 0);

  for (const t of terms) {
    const need = round2(t.amount - (paid.get(t.id) ?? 0));
    if (need <= 0 || unallocated <= 0) continue;
    const add = Math.min(need, unallocated);
    paid.set(t.id, round2((paid.get(t.id) ?? 0) + add));
    unallocated = round2(unallocated - add);
  }

  return paid;
}

export function buildClientPaymentOverview(
  quotes: Awaited<
    ReturnType<
      typeof prisma.quote.findMany<{
        include: {
          paymentTerms: true;
          payments: true;
          invoicePreviews: true;
        };
      }>
    >
  >,
  invoices: Awaited<
    ReturnType<typeof prisma.invoicePreview.findMany>
  >,
  now: Date = new Date()
): ClientPaymentOverview {

  const open: ClientDocumentRow[] = [];
  const closed: ClientDocumentRow[] = [];
  const schedule: PaymentScheduleRow[] = [];

  for (const q of quotes) {
    if (q.status !== "ACCEPTED" || q.invoicePreviews.length > 0) continue;

    const termPaid = allocatePaymentsToTerms(
      q.paymentTerms.map((t) => ({ id: t.id, amount: Number(t.amount) })),
      q.payments
    );

    const acceptanceTerms = q.paymentTerms.filter(isAcceptanceDepositTerm);
    if (acceptanceTerms.length > 0) {
      const quoteRows = acceptanceTerms.map((term) => {
        const amount = Number(term.amount);
        const paidAmount = termPaid.get(term.id) ?? 0;
        const remaining = round2(Math.max(0, amount - paidAmount));
        const due = term.dueDate ?? defaultDueDate(q);
        return {
          term,
          amount,
          paidAmount,
          remaining,
          due,
          status: rowStatus(amount, paidAmount, due, now),
        };
      });
      for (const row of quoteRows) {
        if (row.remaining <= 0.01) continue;
        schedule.push({
          id: row.term.id,
          quoteId: q.id,
          quoteNumber: q.number,
          quoteTitle: q.title,
          label: row.term.label,
          amount: row.amount,
          paidAmount: row.paidAmount,
          remaining: row.remaining,
          dueDate: row.due.toISOString(),
          status: row.status,
        });
      }
    } else if (Number(q.depositAmount) > 0) {
      const deposit = Number(q.depositAmount);
      const paidTotal = q.payments.reduce((s, p) => s + Number(p.amount), 0);
      const due = defaultDueDate(q);
      const remaining = round2(Math.max(0, deposit - paidTotal));
      if (remaining > 0.01) {
        schedule.push({
          id: `quote-${q.id}`,
          quoteId: q.id,
          quoteNumber: q.number,
          quoteTitle: q.title,
          label: "Acconto all'accettazione",
          amount: deposit,
          paidAmount: round2(paidTotal),
          remaining,
          dueDate: due.toISOString(),
          status: rowStatus(deposit, paidTotal, due, now),
        });
      }
    }
  }

  for (const inv of invoices) {
    const total = Number(inv.total);
    const balance = Number(inv.balanceDue);
    const row: ClientDocumentRow = {
      id: inv.id,
      kind: "invoice",
      number: inv.number || "BOZZA",
      title: inv.quoteId ? null : "Documento di cortesia",
      total,
      balanceDue: balance,
      paymentStatus: inv.paymentStatus,
      href: `/invoices/${inv.id}`,
    };
    if (inv.paymentStatus === "PAID") closed.push(row);
    else open.push(row);
  }

  schedule.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const openAmount = round2(
    open.reduce((s, r) => s + r.balanceDue, 0)
  );
  const closedAmount = round2(
    closed.reduce((s, r) => s + (r.total - r.balanceDue), 0)
  );

  return {
    open,
    closed,
    schedule,
    summary: {
      openAmount,
      closedAmount,
      overdueCount: schedule.filter((r) => r.status === "OVERDUE").length,
      upcomingCount: schedule.filter((r) => r.status === "PENDING").length,
    },
  };
}
