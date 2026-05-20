"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import {
  PageCreateBar,
  PageCreateLink,
} from "@/components/layout/page-create-action";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableRow } from "@/components/detail/detail-shell";
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Numero</th>
                    <th className="px-4 py-3 text-left font-medium">Titolo</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Caricamento...
                      </td>
                    </tr>
                  ) : data?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
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
                      </ClickableRow>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
