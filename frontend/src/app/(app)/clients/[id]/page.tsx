"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FileText, Wrench, ClipboardList, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { Header } from "@/components/layout/header";
import {
  DetailBack,
  DetailField,
  DetailSection,
} from "@/components/detail/detail-shell";
import { AttachmentPanel } from "@/components/files/attachment-panel";
import { clientsApi, downloadClientExport } from "@/lib/api";
import { clientStatusLabels, quoteStatusLabels } from "@/lib/labels";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-700 dark:text-green-400",
  LEAD: "bg-blue-500/15 text-blue-700",
  PROSPECT: "bg-amber-500/15 text-amber-700",
  INACTIVE: "bg-gray-500/15 text-gray-600",
  ARCHIVED: "bg-red-500/15 text-red-600",
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exportBusy, setExportBusy] = useState(false);

  const { data: client, isLoading, isError } = useQuery({
    queryKey: ["client", id],
    queryFn: () => clientsApi.get(id),
  });

  const displayName =
    client?.companyName ||
    client?.contactName ||
    [client?.firstName, client?.lastName].filter(Boolean).join(" ") ||
    "Cliente";

  const deleteClient = useMutation({
    mutationFn: () => clientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      router.push("/clients");
    },
    onError: (e: Error) =>
      setDeleteError(e.message || "Impossibile eliminare il cliente."),
  });

  return (
    <>
      <Header title="Dettaglio cliente" />
      <div className="p-6">
        <DetailBack href="/clients" label="Torna ai clienti" />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !client ? (
          <p className="text-destructive">Cliente non trovato.</p>
        ) : (
          <div className="space-y-6">
            {deleteError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[client.email, client.phone].filter(Boolean).join(" · ") ||
                      "Nessun contatto"}
                  </p>
                  {client.createdAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Creato {formatDate(client.createdAt)}
                      {client.updatedAt
                        ? ` · Aggiornato ${formatDate(client.updatedAt)}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium",
                    statusColors[client.status] || statusColors.LEAD
                  )}
                >
                  {clientStatusLabels[client.status] || client.status}
                </span>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Modifica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportBusy}
                  onClick={async () => {
                    setExportBusy(true);
                    try {
                      await downloadClientExport(
                        id,
                        `cliente-${displayName.replace(/\s+/g, "-").slice(0, 40)}.json`
                      );
                    } catch {
                      setDeleteError("Esportazione dati non riuscita.");
                    } finally {
                      setExportBusy(false);
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  {exportBusy ? "Esporto..." : "Esporta dati"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:text-destructive"
                  disabled={deleteClient.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Eliminare ${displayName} e tutti i dati collegati (preventivi, documenti, interventi, pagamenti, account portale)? L'operazione non è reversibile.`
                      )
                    ) {
                      return;
                    }
                    setDeleteError("");
                    deleteClient.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteClient.isPending ? "Elimino..." : "Elimina"}
                </Button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DetailSection title="Contatti e sede">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Email" value={client.email} />
                  <DetailField label="Telefono" value={client.phone} />
                  <DetailField label="Cellulare" value={client.mobile} />
                  <DetailField label="Referente" value={client.contactName} />
                  <DetailField label="Indirizzo" value={client.address} />
                  <DetailField
                    label="Città"
                    value={
                      [client.postalCode, client.city, client.province]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  />
                </div>
              </DetailSection>

              <DetailSection title="Dati fiscali">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Partita IVA" value={client.vatNumber} />
                  <DetailField label="Codice fiscale" value={client.fiscalCode} />
                  {client.tags && client.tags.length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tag
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DetailSection>
            </div>

            <DetailSection title="Allegati">
              <AttachmentPanel entityType="client" entityId={id} />
            </DetailSection>

            {client.notes && (
              <DetailSection title="Note">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {client.notes}
                </p>
              </DetailSection>
            )}

            <DetailSection title="Preventivi recenti">
              {client.quotes && client.quotes.length > 0 ? (
                <ul className="divide-y divide-border">
                  {client.quotes.map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/quotes/${q.id}`}
                        className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">
                              {q.number}
                              {q.title ? ` — ${q.title}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(q.createdAt)} ·{" "}
                              {quoteStatusLabels[q.status] || q.status}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(Number(q.total))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nessun preventivo.</p>
              )}
            </DetailSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <DetailSection title="Interventi recenti">
                {client.interventions && client.interventions.length > 0 ? (
                  <ul className="space-y-3">
                    {client.interventions.map((i) => (
                      <li
                        key={i.id}
                        className="flex items-start gap-3 border-b border-border pb-3 text-sm last:border-0"
                      >
                        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{i.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {i.number} · {i.status}
                            {i.scheduledAt
                              ? ` · ${formatDate(i.scheduledAt)}`
                              : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun intervento.</p>
                )}
              </DetailSection>

              <DetailSection title="Report recenti">
                {client.reports && client.reports.length > 0 ? (
                  <ul className="space-y-3">
                    {client.reports.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start gap-3 border-b border-border pb-3 text-sm last:border-0"
                      >
                        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{r.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.status} · {Number(r.workHours)}h ·{" "}
                            {formatDate(r.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun report.</p>
                )}
              </DetailSection>
            </div>
          </div>
        )}
      </div>
      {client && (
        <ClientFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          client={client}
        />
      )}
    </>
  );
}
