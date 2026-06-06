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
import { interventionsApi } from "@/lib/api";
import { interventionStatusLabels } from "@/lib/labels";
import { SECTION_CREATE } from "@/lib/section-create";
import { formatDate, cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-500/15 text-blue-700",
  IN_PROGRESS: "bg-amber-500/15 text-amber-700",
  COMPLETED: "bg-green-500/15 text-green-700",
  CANCELLED: "bg-red-500/15 text-red-600",
};

export default function InterventionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const deleteIntervention = useMutation({
    mutationFn: (id: string) => interventionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interventions"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ["interventions"],
    queryFn: interventionsApi.list,
  });

  return (
    <>
      <Header title="Interventi" />
      <div className="p-3 sm:p-4 md:p-6">
        <PageCreateBar>
          <PageCreateLink
            href="/interventions/new"
            label={SECTION_CREATE.intervention}
          />
        </PageCreateBar>
        <div className="space-y-2 md:hidden">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Caricamento...
            </p>
          ) : data?.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun intervento.
            </p>
          ) : (
            data?.map((item) => (
              <ListCard
                key={item.id}
                onClick={() => router.push(`/interventions/${item.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      {item.number}
                    </p>
                    <p className="mt-1 font-semibold leading-snug line-clamp-2">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {item.client?.companyName || item.client?.contactName || "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      statusColors[item.status] || statusColors.SCHEDULED
                    )}
                  >
                    {interventionStatusLabels[item.status] || item.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {item.scheduledAt ? formatDate(item.scheduledAt) : "Data da definire"}
                </p>
              </ListCard>
            ))
          )}
        </div>

        <DataCard className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Numero</th>
                    <th className="px-4 py-3 text-left font-medium">Titolo</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Data</th>
                    <th className="w-24 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Caricamento...
                      </td>
                    </tr>
                  ) : data?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Nessun intervento.
                      </td>
                    </tr>
                  ) : (
                    data?.map((item) => (
                      <ClickableRow
                        key={item.id}
                        onClick={() => router.push(`/interventions/${item.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{item.number}</td>
                        <td className="px-4 py-3 font-medium">{item.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.client?.companyName || item.client?.contactName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              statusColors[item.status] || statusColors.SCHEDULED
                            )}
                          >
                            {interventionStatusLabels[item.status] || item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {item.scheduledAt ? formatDate(item.scheduledAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeleteEntityButton
                            size="icon"
                            pending={deleteIntervention.isPending}
                            confirmMessage={`Eliminare l'intervento ${item.number}?`}
                            onConfirm={() => deleteIntervention.mutate(item.id)}
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
