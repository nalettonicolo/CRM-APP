"use client";

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { interventionsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: interventionsApi.reports,
  });

  return (
    <>
      <Header title="Report interventi" />
      <div className="p-6">
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
                    <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{r.number}</td>
                      <td className="px-4 py-3">{r.client?.companyName}</td>
                      <td className="px-4 py-3">{r.status}</td>
                      <td className="px-4 py-3 text-right">{Number(r.workHours)}h</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </td>
                    </tr>
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
