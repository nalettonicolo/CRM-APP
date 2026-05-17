"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClickableRow } from "@/components/detail/detail-shell";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { clientsApi } from "@/lib/api";
import { clientStatusLabels } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-700 dark:text-green-400",
  LEAD: "bg-blue-500/15 text-blue-700",
  PROSPECT: "bg-amber-500/15 text-amber-700",
  INACTIVE: "bg-gray-500/15 text-gray-600",
  ARCHIVED: "bg-red-500/15 text-red-600",
};

function clientDisplayName(client: {
  companyName?: string | null;
  contactName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    client.companyName ||
    client.contactName ||
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    "Cliente"
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["clients", search, status],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (status) params.status = status;
      return clientsApi.list(Object.keys(params).length ? params : undefined);
    },
  });

  return (
    <>
      <Header title="Clienti" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca clienti..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Tutti gli stati</option>
              {Object.entries(clientStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo cliente
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Contatto</th>
                    <th className="px-4 py-3 text-left font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Preventivi</th>
                    <th className="px-4 py-3 text-right font-medium">Interventi</th>
                    <th className="px-4 py-3 text-right font-medium">Aggiornato</th>
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
                  ) : data?.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Nessun cliente trovato.
                      </td>
                    </tr>
                  ) : (
                    data?.data.map((client) => (
                      <ClickableRow
                        key={client.id}
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">
                          {clientDisplayName(client)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {client.email || client.phone || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              statusColors[client.status] || statusColors.LEAD
                            )}
                          >
                            {clientStatusLabels[client.status] || client.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {client._count?.quotes ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {client._count?.interventions ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {client.updatedAt
                            ? formatDate(client.updatedAt)
                            : client.createdAt
                              ? formatDate(client.createdAt)
                              : "—"}
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
      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
