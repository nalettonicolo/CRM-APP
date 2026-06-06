"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import {
  PageCreateBar,
  PageCreateLink,
} from "@/components/layout/page-create-action";
import { DataCard } from "@/components/ui/data-card";
import { ListCard } from "@/components/ui/list-card";
import { ClickableRow } from "@/components/detail/detail-shell";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { quotesApi } from "@/lib/api";
import { quoteStatusLabels } from "@/lib/labels";
import { formatQuoteDocumentNumber } from "@/lib/document-copy";
import {
  formatQuoteListSubtitle,
  formatQuoteServicePeriod,
} from "@/lib/quote-display";
import { SECTION_CREATE } from "@/lib/section-create";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SENT: "bg-blue-500/15 text-blue-700",
  ACCEPTED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
  EXPIRED: "bg-amber-500/15 text-amber-700",
};

export default function QuotesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const deleteQuote = useMutation({
    mutationFn: (id: string) => quotesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => quotesApi.list(),
  });

  return (
    <>
      <Header title="Preventivi" />
      <div className="p-3 sm:p-4 md:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Ogni riga riassume oggetto, periodo di servizio e luogo. Le date non vanno
          nell&apos;oggetto: usale nei campi dedicati in modifica.
        </p>
        <PageCreateBar className="mb-6">
          <PageCreateLink href="/quotes/new" label={SECTION_CREATE.quote} />
        </PageCreateBar>

        <div className="space-y-2 md:hidden">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Caricamento...
            </p>
          ) : !data?.data.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun preventivo.
            </p>
          ) : (
            data.data.map((q) => (
              <ListCard
                key={q.id}
                onClick={() => router.push(`/quotes/${q.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatQuoteDocumentNumber(q.number)}
                    </p>
                    <p className="mt-1 font-semibold leading-snug line-clamp-2">
                      {q.title || "Senza oggetto"}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {q.client?.companyName || q.client?.contactName || "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      statusStyle[q.status]
                    )}
                  >
                    {quoteStatusLabels[q.status] || q.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(q.total))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(q.createdAt)}
                  </span>
                </div>
                {(formatQuoteServicePeriod(q) || q.eventLocation?.trim()) && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
                    {[formatQuoteServicePeriod(q), q.eventLocation?.trim()]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </ListCard>
            ))
          )}
        </div>

        <DataCard className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">N. preventivo</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Oggetto</th>
                    <th className="px-4 py-3 text-left font-medium">Periodo servizio</th>
                    <th className="px-4 py-3 text-left font-medium">Luogo</th>
                    <th className="px-4 py-3 text-left font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Importo</th>
                    <th className="px-4 py-3 text-right font-medium">Emesso il</th>
                    <th className="px-4 py-3 text-right font-medium w-24" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Caricamento...
                      </td>
                    </tr>
                  ) : (
                    data?.data.map((q) => (
                      <ClickableRow
                        key={q.id}
                        onClick={() => router.push(`/quotes/${q.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {formatQuoteDocumentNumber(q.number)}
                        </td>
                        <td className="px-4 py-3">
                          {q.client?.companyName || q.client?.contactName}
                        </td>
                        <td className="px-4 py-3 max-w-[11rem]">
                          <span className="line-clamp-2" title={q.title || undefined}>
                            {q.title || "—"}
                          </span>
                          {formatQuoteListSubtitle(q) && (
                            <span className="mt-0.5 block text-xs text-muted-foreground lg:hidden">
                              {formatQuoteListSubtitle(q)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatQuoteServicePeriod(q) || "—"}
                        </td>
                        <td className="px-4 py-3 max-w-[9rem] truncate text-muted-foreground">
                          {q.eventLocation?.trim() || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              statusStyle[q.status]
                            )}
                          >
                            {quoteStatusLabels[q.status] || q.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(Number(q.total))}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatDate(q.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeleteEntityButton
                            size="icon"
                            pending={deleteQuote.isPending}
                            confirmMessage={`Eliminare il preventivo ${q.number}?`}
                            onConfirm={() => deleteQuote.mutate(q.id)}
                          />
                        </td>
                      </ClickableRow>
                    ))
                  )}
                </tbody>
              </table>
        </DataCard>
      </div>
    </>
  );
}
