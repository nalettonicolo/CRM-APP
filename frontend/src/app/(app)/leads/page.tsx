"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { leadsApi, type LeadItem } from "@/lib/api";
import { leadStatusLabels } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";

function statusLabel(status: string) {
  return leadStatusLabels[status] || status;
}

function servicesSummary(lead: LeadItem) {
  if (lead.services?.length) return lead.services.join(", ");
  return "—";
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsApi.list({ limit: "100" }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["lead", selectedId],
    queryFn: () => leadsApi.get(selectedId!),
    enabled: !!selectedId,
  });

  const convert = useMutation({
    mutationFn: (id: string) =>
      leadsApi.update(id, { convertToClient: true, status: "CONVERTED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", selectedId] });
      setSelectedId(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: () =>
      leadsApi.update(selectedId!, { status: statusDraft }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", selectedId] });
    },
  });

  function openLead(id: string, currentStatus: string) {
    setSelectedId(id);
    setStatusDraft(currentStatus);
  }

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
                    <th className="px-4 py-3 text-left">Servizi</th>
                    <th className="px-4 py-3 text-left">Stato</th>
                    <th className="px-4 py-3 text-right">Azioni</th>
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
                  ) : data?.data.length ? (
                    data.data.map((lead) => (
                      <tr
                        key={lead.id}
                        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
                        onClick={() => openLead(lead.id, lead.status)}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium">{lead.name}</td>
                        <td className="px-4 py-3">{lead.email}</td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                          {servicesSummary(lead)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              lead.status === "CONVERTED"
                                ? "bg-green-500/15 text-green-700"
                                : lead.status === "new" || lead.status === "NEW"
                                  ? "bg-blue-500/15 text-blue-700"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {statusLabel(lead.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {lead.status !== "CONVERTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={convert.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                convert.mutate(lead.id);
                              }}
                            >
                              Crea cliente
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Nessuna richiesta
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettaglio richiesta</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Caricamento…</p>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="font-medium">{formatDate(detail.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fonte</dt>
                  <dd className="font-medium">{detail.source || "Sito web"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Nome</dt>
                  <dd className="font-medium">{detail.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${detail.email}`}
                      className="text-primary hover:underline"
                    >
                      {detail.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Telefono</dt>
                  <dd>{detail.phone || "—"}</dd>
                </div>
                {detail.company && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Azienda</dt>
                    <dd>{detail.company}</dd>
                  </div>
                )}
              </dl>

              <div>
                <p className="mb-2 font-medium">Servizi richiesti</p>
                {detail.services?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {detail.services.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-muted-foreground">
                    Nessun servizio selezionato (richieste inviate prima
                    dell&apos;aggiornamento o senza selezione).
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1 font-medium">Messaggio</p>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
                  {detail.message || "—"}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Stato</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                >
                  <option value="new">Nuova</option>
                  <option value="contacted">Contattata</option>
                  <option value="qualified">Qualificata</option>
                  <option value="CONVERTED">Convertita</option>
                  <option value="lost">Persa</option>
                </select>
              </div>

              {detail.client && (
                <p className="text-xs text-muted-foreground">
                  Cliente collegato:{" "}
                  <Link
                    href={`/clients/${detail.client.id}`}
                    className="text-primary hover:underline"
                  >
                    {detail.client.companyName ||
                      detail.client.contactName ||
                      detail.client.email}
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <p className="text-destructive">Richiesta non trovata.</p>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Chiudi
            </Button>
            <div className="flex flex-wrap gap-2">
              {detail && detail.status !== "CONVERTED" && (
                <>
                  <Button
                    variant="outline"
                    disabled={updateStatus.isPending || !selectedId}
                    onClick={() => updateStatus.mutate()}
                  >
                    Salva stato
                  </Button>
                  <Button
                    disabled={convert.isPending}
                    onClick={() => convert.mutate(detail.id)}
                  >
                    Crea cliente
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
