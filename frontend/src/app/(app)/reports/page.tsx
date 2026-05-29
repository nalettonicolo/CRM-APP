"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import {
  PageCreateBar,
  PageCreateLink,
} from "@/components/layout/page-create-action";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableRow } from "@/components/detail/detail-shell";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { interventionsApi, reportsApi } from "@/lib/api";
import { reportStatusLabels } from "@/lib/labels";
import { DOCUMENT_COPY } from "@/lib/document-copy";
import { SECTION_CREATE } from "@/lib/section-create";
import { formatDate, cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SUBMITTED: "bg-blue-500/15 text-blue-700",
  APPROVED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
};

export default function ReportsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const deleteReport = useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["intervention-reports"] });
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: interventionsApi.reports,
  });

  return (
    <>
      <Header title={DOCUMENT_COPY.report.listTitle} />
      <div className="p-3 sm:p-4 md:p-6">
        <PageCreateBar>
          <PageCreateLink href="/reports/new" label={SECTION_CREATE.report} />
        </PageCreateBar>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left">Numero</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-right">Ore</th>
                  <th className="px-4 py-3 text-right">Data</th>
                  <th className="w-24 px-4 py-3" />
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
                  data?.map((r) => (
                    <ClickableRow
                      key={r.id}
                      onClick={() => router.push(`/reports/${r.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{r.number}</td>
                      <td className="px-4 py-3">{r.client?.companyName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            statusColors[r.status] || statusColors.DRAFT
                          )}
                        >
                          {reportStatusLabels[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{Number(r.workHours)}h</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteEntityButton
                          size="icon"
                          pending={deleteReport.isPending}
                          confirmMessage={`Eliminare il verbale ${r.number}?`}
                          onConfirm={() => deleteReport.mutate(r.id)}
                        />
                      </td>
                    </ClickableRow>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
