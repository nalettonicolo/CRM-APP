"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableRow } from "@/components/detail/detail-shell";
import { interventionsApi } from "@/lib/api";
import { reportStatusLabels } from "@/lib/labels";
import { formatDate, cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SUBMITTED: "bg-blue-500/15 text-blue-700",
  APPROVED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
};

export default function ReportsPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: interventionsApi.reports,
  });

  return (
    <>
      <Header title="Report interventi" />
      <div className="p-6">
        <div className="mb-4 flex justify-end">
          <Button asChild>
            <Link href="/reports/new">
              <Plus className="h-4 w-4" /> Nuovo report
            </Link>
          </Button>
        </div>
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
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
