"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  FileText,
  Receipt,
} from "lucide-react";
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

export function OpenPaymentsPanel({ clientId }: { clientId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["payments", "open-overview", clientId ?? "all"],
    queryFn: () => paymentsApi.openOverview(clientId ? { clientId } : undefined),
  });

  if (isLoading) {
    return (
      <p className="mb-6 text-sm text-muted-foreground">
        Caricamento pagamenti aperti…
      </p>
    );
  }

  if (!data) return null;

  const hasOpen = data.open.length > 0 || data.schedule.length > 0;

  return (
    <div className="mb-6 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-4 w-4" />
            Pagamenti aperti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Totale da incassare:{" "}
            <strong className="text-foreground tabular-nums">
              {formatCurrency(data.summary.openAmount)}
            </strong>
            {data.summary.overdueCount > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                · {data.summary.overdueCount} scaduta/e
              </span>
            )}
            {data.summary.upcomingCount > 0 && (
              <span className="ml-1">
                · {data.summary.upcomingCount} in attesa
              </span>
            )}
          </p>

          {!hasOpen ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Nessun preventivo o documento con saldo aperto.
            </p>
          ) : (
            <div className="space-y-6">
              {data.open.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Documenti con saldo
                  </p>
                  <ul className="space-y-2">
                    {data.open.map((doc) => (
                      <li key={`${doc.kind}-${doc.id}`}>
                        <Link
                          href={doc.href}
                          className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">
                              {doc.clientName}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {doc.kind === "quote" ? (
                                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                              ) : (
                                <Receipt className="h-3.5 w-3.5 shrink-0 text-primary" />
                              )}
                              <span className="font-mono text-xs">
                                {doc.number}
                              </span>
                              {doc.title && (
                                <span className="truncate text-xs text-muted-foreground">
                                  {doc.title}
                                </span>
                              )}
                            </p>
                            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                              {paymentStatusLabels[doc.paymentStatus] ||
                                doc.paymentStatus}
                            </span>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                            {formatCurrency(doc.balanceDue)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.schedule.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Scadenziario (rate e saldi)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-3 py-2 text-left">Scadenza</th>
                          <th className="px-3 py-2 text-left">Cliente</th>
                          <th className="px-3 py-2 text-left">Preventivo</th>
                          <th className="px-3 py-2 text-left">Rata</th>
                          <th className="px-3 py-2 text-right">Residuo</th>
                          <th className="px-3 py-2 text-left">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.schedule.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="whitespace-nowrap px-3 py-2 font-medium">
                              {formatDate(row.dueDate)}
                            </td>
                            <td className="px-3 py-2">{row.clientName}</td>
                            <td className="px-3 py-2">
                              <Link
                                href={`/quotes/${row.quoteId}`}
                                className="font-mono text-xs text-primary hover:underline"
                              >
                                {row.quoteNumber}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.label}
                            </td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">
                              {formatCurrency(row.remaining)}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  scheduleStatusStyle[row.status]
                                )}
                              >
                                {scheduleRowStatusLabels[row.status] ||
                                  row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
