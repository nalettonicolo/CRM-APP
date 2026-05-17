"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { leadsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function LeadsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsApi.list(),
  });

  const convert = useMutation({
    mutationFn: (id: string) =>
      leadsApi.update(id, { convertToClient: true, status: "CONVERTED" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  return (
    <>
      <Header title="Richieste contatto" />
      <div className="p-3 sm:p-4 md:p-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Stato</th>
                    <th className="px-4 py-3 text-right">Azioni</th>
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
                    data?.data.map((lead) => (
                      <tr key={lead.id} className="border-b border-border">
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium">{lead.name}</td>
                        <td className="px-4 py-3">{lead.email}</td>
                        <td className="px-4 py-3">{lead.status}</td>
                        <td className="px-4 py-3 text-right">
                          {lead.status !== "CONVERTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={convert.isPending}
                              onClick={() => convert.mutate(lead.id)}
                            >
                              Crea cliente
                            </Button>
                          )}
                        </td>
                      </tr>
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
