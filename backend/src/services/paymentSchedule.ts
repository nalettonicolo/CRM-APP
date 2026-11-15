import { prisma } from "../lib/prisma.js";
import {
  buildClientPaymentOverview,
  clientDisplayName,
  type ClientDocumentRow,
  type ClientPaymentOverview,
  type PaymentScheduleRow,
} from "./paymentScheduleCalc.js";

export type {
  ClientDocumentRow,
  ClientPaymentOverview,
  PaymentScheduleRow,
  ScheduleRowStatus,
} from "./paymentScheduleCalc.js";

export interface OpenPaymentDocumentRow extends ClientDocumentRow {
  clientId: string;
  clientName: string;
}

export interface OpenPaymentScheduleRow extends PaymentScheduleRow {
  clientId: string;
  clientName: string;
}

export interface OpenPaymentsOverview {
  open: OpenPaymentDocumentRow[];
  schedule: OpenPaymentScheduleRow[];
  summary: {
    openAmount: number;
    overdueCount: number;
    upcomingCount: number;
    partialCount: number;
  };
}

export async function getOpenPaymentsOverview(
  clientId?: string
): Promise<OpenPaymentsOverview> {
  const clientWhere = clientId ? { clientId } : {};
  const [quotes, invoices] = await Promise.all([
    prisma.quote.findMany({
      where: {
        ...clientWhere,
        status: "ACCEPTED",
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            firstName: true,
            lastName: true,
          },
        },
        paymentTerms: { orderBy: { sortOrder: "asc" } },
        payments: true,
        invoicePreviews: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoicePreview.findMany({
      where: clientWhere,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const overview = buildClientPaymentOverview(quotes, invoices);
  const clientByQuoteId = new Map(quotes.map((q) => [q.id, q.client]));
  const clientByInvoiceId = new Map(invoices.map((i) => [i.id, i.client]));

  const open: OpenPaymentDocumentRow[] = overview.open.map((doc) => {
    const client =
      doc.kind === "quote"
        ? clientByQuoteId.get(doc.id)!
        : clientByInvoiceId.get(doc.id)!;
    return {
      ...doc,
      clientId: client.id,
      clientName: clientDisplayName(client),
    };
  });

  const schedule: OpenPaymentScheduleRow[] = overview.schedule
    .filter((row) => row.status !== "PAID" && row.remaining > 0.01)
    .map((row) => {
      const client = clientByQuoteId.get(row.quoteId)!;
      return {
        ...row,
        clientId: client.id,
        clientName: clientDisplayName(client),
      };
    });

  return {
    open,
    schedule,
    summary: {
      openAmount: overview.summary.openAmount,
      overdueCount: overview.summary.overdueCount,
      upcomingCount: overview.summary.upcomingCount,
      partialCount: schedule.filter((r) => r.status === "PARTIAL").length,
    },
  };
}

export async function getClientPaymentOverview(
  clientId: string
): Promise<ClientPaymentOverview> {
  const [quotes, invoices] = await Promise.all([
    prisma.quote.findMany({
      where: {
        clientId,
        status: "ACCEPTED",
      },
      include: {
        paymentTerms: { orderBy: { sortOrder: "asc" } },
        payments: true,
        invoicePreviews: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoicePreview.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return buildClientPaymentOverview(quotes, invoices);
}
