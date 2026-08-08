"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Printer, Trash2 } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
import { ListCard } from "@/components/ui/list-card";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import {
  printTransportDocumentPdf,
  transportDocumentsApi,
} from "@/lib/api";
import {
  TRANSPORT_STATUS_LABELS,
  TRANSPORT_STATUS_STYLES,
  transportReasonLabel,
} from "@/lib/transport-document";
import { cn, formatDate } from "@/lib/utils";

export default function TransportDocumentsPage() {
  const qc = useQueryClient();
  const routes = useWorkspaceRoutes();
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["transport-documents"],
    queryFn: transportDocumentsApi.list,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => transportDocumentsApi.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["transport-documents"] }),
  });

  return (
    <>
      <WorkspaceHeader title="Documenti di trasporto (DDT)" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link href={routes.print} className="text-primary hover:underline">
            ← Centro stampa
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Crea e stampa DDT professionali con mittente, destinatario, causale
            trasporto, righe merce e firme. Collegamento opzionale al preventivo
            o al catalogo noleggio.
          </p>
          <Button asChild>
            <Link href={routes.printDdtNew}>
              <Plus className="h-4 w-4" /> Nuovo DDT
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento…</p>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground">
            Nessun DDT ancora. Crea il primo documento di trasporto.
          </p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {documents.map((doc) => (
                <ListCard key={doc.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {doc.number}
                      </p>
                      <p className="mt-1 font-semibold">
                        {doc.client?.companyName ||
                          doc.client?.contactName ||
                          "Cliente"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {transportReasonLabel(doc.reason)} ·{" "}
                        {formatDate(doc.issueDate)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        TRANSPORT_STATUS_STYLES[doc.status]
                      )}
                    >
                      {TRANSPORT_STATUS_LABELS[doc.status] || doc.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={routes.printDdtDetail(doc.id)}>Apri</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => printTransportDocumentPdf(doc.id)}
                    >
                      <Printer className="h-4 w-4" /> Stampa
                    </Button>
                  </div>
                </ListCard>
              ))}
            </div>

            <DataCard className="hidden md:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[8.5rem]" />
                  <col />
                  <col className="w-32" />
                  <col className="w-28" />
                  <col className="w-36" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left">Numero</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Causale</th>
                    <th className="px-4 py-3 text-left">Stato</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="w-40 px-4 py-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border/70 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">
                        {doc.number}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {doc.client?.companyName ||
                          doc.client?.contactName ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {transportReasonLabel(doc.reason)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            TRANSPORT_STATUS_STYLES[doc.status]
                          )}
                        >
                          {TRANSPORT_STATUS_LABELS[doc.status] || doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(doc.issueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={routes.printDdtDetail(doc.id)}>
                              <FileText className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => printTransportDocumentPdf(doc.id)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Eliminare il DDT ${doc.number}?`
                                )
                              ) {
                                return;
                              }
                              deleteMut.mutate(doc.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataCard>
          </>
        )}
      </div>
    </>
  );
}
