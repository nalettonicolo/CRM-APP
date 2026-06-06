"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import {
  PageCreateButton,
} from "@/components/layout/page-create-action";
import { DataCard } from "@/components/ui/data-card";
import { ListCard } from "@/components/ui/list-card";
import { appSelectClass } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientDetailDialog } from "@/components/clients/client-detail-dialog";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { clientsApi, type Client } from "@/lib/api";
import { clientStatusLabels } from "@/lib/labels";
import { SECTION_CREATE } from "@/lib/section-create";
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
  const qc = useQueryClient();
  const deleteClient = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
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
              className={appSelectClass}
            >
              <option value="">Tutti gli stati</option>
              {Object.entries(clientStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <PageCreateButton
            label={SECTION_CREATE.client}
            onClick={() => setDialogOpen(true)}
          />
        </div>

        <div className="space-y-2 md:hidden">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Caricamento...
            </p>
          ) : data?.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun cliente trovato.
            </p>
          ) : (
            data?.data.map((client) => (
              <ListCard
                key={client.id}
                onClick={() => setSelectedId(client.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">
                      {clientDisplayName(client)}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {client.email || client.phone || "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      statusColors[client.status] || statusColors.LEAD
                    )}
                  >
                    {clientStatusLabels[client.status] || client.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span>{client._count?.quotes ?? 0} prev.</span>
                  <span>{client._count?.interventions ?? 0} int.</span>
                </div>
              </ListCard>
            ))
          )}
        </div>

        <DataCard className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Contatto</th>
                    <th className="px-4 py-3 text-left font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Preventivi</th>
                    <th className="px-4 py-3 text-right font-medium">Interventi</th>
                    <th className="px-4 py-3 text-right font-medium">Aggiornato</th>
                    <th className="w-24 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Caricamento...
                      </td>
                    </tr>
                  ) : data?.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Nessun cliente trovato.
                      </td>
                    </tr>
                  ) : (
                    data?.data.map((client) => (
                      <tr
                        key={client.id}
                        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
                        onClick={() => setSelectedId(client.id)}
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
                        <td className="px-4 py-3 text-right">
                          <DeleteEntityButton
                            size="icon"
                            pending={deleteClient.isPending}
                            confirmMessage={`Eliminare ${clientDisplayName(client)} e tutti i dati collegati?`}
                            onConfirm={() => deleteClient.mutate(client.id)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
        </DataCard>
      </div>
      <ClientDetailDialog
        clientId={selectedId}
        open={!!selectedId && !editClient}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onDeleted={() => setSelectedId(null)}
        onEdit={() => {
          if (!selectedId) return;
          clientsApi.get(selectedId).then((c) => setEditClient(c));
        }}
      />
      <ClientFormDialog
        open={dialogOpen || !!editClient}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditClient(null);
          }
        }}
        client={editClient}
        onSaved={() => {
          setEditClient(null);
          setDialogOpen(false);
        }}
      />
    </>
  );
}
