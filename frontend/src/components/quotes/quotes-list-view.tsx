"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PageCreateBar,
  PageCreateLink,
} from "@/components/layout/page-create-action";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { DataCard } from "@/components/ui/data-card";
import { ListCard } from "@/components/ui/list-card";
import { ClickableRow } from "@/components/detail/detail-shell";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
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

export function QuotesListView() {
  const router = useRouter();
  const routes = useWorkspaceRoutes();
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
      <WorkspaceHeader title="Preventivi" />
      <div className="p-3 sm:p-4 md:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Ogni riga riassume oggetto, periodo di servizio e luogo.
        </p>
        <PageCreateBar className="mb-6">
          <PageCreateLink href={routes.quotesNew} label={SECTION_CREATE.quote} />
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
                onClick={() => router.push(routes.quote(q.id))}
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
                <th className="px-4 py-3 text-left font-medium">Stato</th>
                <th className="px-4 py-3 text-right font-medium">Importo</th>
                <th className="px-4 py-3 text-right font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Caricamento...
                  </td>
                </tr>
              ) : (
                data?.data.map((q) => (
                  <ClickableRow
                    key={q.id}
                    onClick={() => router.push(routes.quote(q.id))}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatQuoteDocumentNumber(q.number)}
                    </td>
                    <td className="px-4 py-3">
                      {q.client?.companyName || q.client?.contactName}
                    </td>
                    <td className="px-4 py-3 max-w-[14rem]">
                      <span className="line-clamp-2">{q.title || "—"}</span>
                      {formatQuoteListSubtitle(q) && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {formatQuoteListSubtitle(q)}
                        </span>
                      )}
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
