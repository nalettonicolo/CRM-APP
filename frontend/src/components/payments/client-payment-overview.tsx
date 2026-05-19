"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, CheckCircle2, FileText, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { paymentsApi } from "@/lib/api";
import {
  paymentStatusLabels,
  scheduleRowStatusLabels,
} from "@/lib/labels";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const scheduleStatusStyle: Record<string, string> = {
  PAID: "bg-green-500/15 text-green-700 dark:text-green-400",
  PARTIAL: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  PENDING: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  OVERDUE: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function DocumentList({
  items,
  empty,
}: {
  items: {
    id: string;
    kind: "quote" | "invoice";
    number: string;
    title: string | null;
    total: number;
    balanceDue: number;
    paymentStatus: string;
    href: string;
  }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((doc) => (
        <li key={`${doc.kind}-${doc.id}`}>
          <Link
            href={doc.href}
            className="flex items-start justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium">
                {doc.kind === "quote" ? (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Receipt className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="font-mono text-xs">{doc.number}</span>
              </p>
              {doc.title && (
                <p className="truncate text-xs text-muted-foreground">{doc.title}</p>
              )}
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                {paymentStatusLabels[doc.paymentStatus] || doc.paymentStatus}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium tabular-nums">
                {formatCurrency(doc.balanceDue > 0 ? doc.balanceDue : doc.total)}
              </p>
              {doc.balanceDue > 0 && doc.balanceDue < doc.total && (
                <p className="text-[10px] text-muted-foreground line-through">
                  {formatCurrency(doc.total)}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ClientPaymentOverview({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["payments", "client-overview", clientId],
    queryFn: () => paymentsApi.clientOverview(clientId),
    enabled: Boolean(clientId),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Caricamento situazione cliente…</p>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              Da incassare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Totale residuo:{" "}
              <strong className="text-foreground">
                {formatCurrency(data.summary.openAmount)}
              </strong>
            </p>
            <DocumentList
              items={data.open}
              empty="Nessun preventivo o documento con saldo aperto."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Incassati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Totale incassato (documenti chiusi):{" "}
              <strong className="text-foreground">
                {formatCurrency(data.summary.closedAmount)}
              </strong>
            </p>
            <DocumentList
              items={data.closed}
              empty="Nessun documento ancora saldato."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" />
            Scadenziario
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {data.schedule.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nessuna scadenza: aggiungi un piano di pagamento con date nel preventivo
              (modifica preventivo → Piano di pagamento → Scadenza).
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left">Scadenza</th>
                  <th className="px-4 py-3 text-left">Preventivo</th>
                  <th className="px-4 py-3 text-left">Rata</th>
                  <th className="px-4 py-3 text-right">Importo</th>
                  <th className="px-4 py-3 text-right">Incassato</th>
                  <th className="px-4 py-3 text-right">Residuo</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                </tr>
              </thead>
              <tbody>
                {data.schedule.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {formatDate(row.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/quotes/${row.quoteId}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {row.quoteNumber}
                      </Link>
                      {row.quoteTitle && (
                        <p className="max-w-[10rem] truncate text-xs text-muted-foreground">
                          {row.quoteTitle}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-400">
                      {formatCurrency(row.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(row.remaining)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          scheduleStatusStyle[row.status]
                        )}
                      >
                        {scheduleRowStatusLabels[row.status] || row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(data.summary.overdueCount > 0 || data.summary.upcomingCount > 0) && (
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              {data.summary.overdueCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {data.summary.overdueCount} scaduta/e ·{" "}
                </span>
              )}
              {data.summary.upcomingCount} in attesa
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
