"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { portalApi } from "@/lib/api";
import { reportStatusLabels } from "@/lib/labels";
import { formatDate, cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SUBMITTED: "bg-blue-500/15 text-blue-700",
  APPROVED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
};

export default function PortalReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: portalApi.dashboard,
  });

  const reports = data?.reports ?? [];

  return (
    <>
      <Header title="I tuoi report" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nessun report disponibile.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/reports/${r.id}`}>
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{r.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          statusColors[r.status] || statusColors.DRAFT
                        )}
                      >
                        {reportStatusLabels[r.status] || r.status}
                      </span>
                      <p className="mt-2 text-sm font-medium tabular-nums">
                        {Number(r.workHours)} ore
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
