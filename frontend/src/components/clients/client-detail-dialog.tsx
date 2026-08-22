"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { useWorkspace, useWorkspaceRoutes } from "@/contexts/workspace-context";
import { clientsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { clientStatusLabels } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-700 dark:text-green-400",
  LEAD: "bg-blue-500/15 text-blue-700",
  PROSPECT: "bg-amber-500/15 text-amber-700",
  INACTIVE: "bg-gray-500/15 text-gray-600",
  ARCHIVED: "bg-red-500/15 text-red-600",
};

function relationCount(
  count: number | undefined,
  items: unknown[] | undefined
) {
  if (typeof count === "number") return count;
  return items?.length ?? 0;
}

function displayName(client: {
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

export function ClientDetailDialog({
  clientId,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDeleted?: () => void;
}) {
  const workspace = useWorkspace();
  const routes = useWorkspaceRoutes();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: client, isLoading, isError } = useQuery({
    queryKey: queryKeys.client(workspace, clientId ?? ""),
    queryFn: () => clientsApi.get(clientId!),
    enabled: open && !!clientId,
  });

  const deleteClient = useMutation({
    mutationFn: () => clientsApi.delete(clientId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [workspace, "clients"] });
      onOpenChange(false);
      onDeleted?.();
      router.push(routes.clients);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Riepilogo cliente</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : isError || !client ? (
          <p className="text-sm text-destructive">Cliente non trovato.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{displayName(client)}</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  statusColors[client.status] || statusColors.LEAD
                )}
              >
                {clientStatusLabels[client.status] || client.status}
              </span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              {client.companyName && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Ragione sociale</dt>
                  <dd className="font-medium">{client.companyName}</dd>
                </div>
              )}
              {(client.firstName || client.lastName) && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Nome e cognome</dt>
                  <dd className="font-medium">
                    {[client.firstName, client.lastName].filter(Boolean).join(" ")}
                  </dd>
                </div>
              )}
              {client.contactName && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Referente</dt>
                  <dd>{client.contactName}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>
                  {client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      className="text-primary hover:underline"
                    >
                      {client.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefono</dt>
                <dd>{client.phone || client.mobile || "—"}</dd>
              </div>
              {(client.address || client.city) && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Indirizzo</dt>
                  <dd>
                    {[client.address, client.postalCode, client.city, client.province]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
              )}
              {client.vatNumber && (
                <div>
                  <dt className="text-muted-foreground">P. IVA</dt>
                  <dd>{client.vatNumber}</dd>
                </div>
              )}
              {client.fiscalCode && (
                <div>
                  <dt className="text-muted-foreground">Codice fiscale</dt>
                  <dd>{client.fiscalCode}</dd>
                </div>
              )}
              {client.pec && (
                <div>
                  <dt className="text-muted-foreground">PEC</dt>
                  <dd>{client.pec}</dd>
                </div>
              )}
              {client.sdiCode && (
                <div>
                  <dt className="text-muted-foreground">Codice SDI</dt>
                  <dd>{client.sdiCode}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Preventivi</dt>
                <dd className="font-medium tabular-nums">
                  {relationCount(client._count?.quotes, client.quotes)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Interventi</dt>
                <dd className="font-medium tabular-nums">
                  {relationCount(
                    client._count?.interventions,
                    client.interventions
                  )}
                </dd>
              </div>
              {client.createdAt && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Creato</dt>
                  <dd>{formatDate(client.createdAt)}</dd>
                </div>
              )}
            </dl>

            {client.quotes && client.quotes.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Preventivi recenti</p>
                <ul className="space-y-2">
                  {client.quotes.slice(0, 5).map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/quotes/${q.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/30"
                        onClick={() => onOpenChange(false)}
                      >
                        <span className="min-w-0 truncate font-medium">
                          {q.number}
                          {q.title ? ` — ${q.title}` : ""}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(q.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {client.notes && (
              <div>
                <p className="mb-1 font-medium">Note</p>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
                  {client.notes}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
          <div className="flex flex-wrap gap-2">
            {client && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/clients/${client.id}`}>Scheda completa</Link>
                </Button>
                <Button onClick={onEdit}>
                  <Pencil className="h-4 w-4" /> Modifica
                </Button>
                <DeleteEntityButton
                  pending={deleteClient.isPending}
                  confirmMessage={`Eliminare ${displayName(client)} e tutti i dati collegati? L'operazione non è reversibile.`}
                  onConfirm={() => deleteClient.mutate()}
                />
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
