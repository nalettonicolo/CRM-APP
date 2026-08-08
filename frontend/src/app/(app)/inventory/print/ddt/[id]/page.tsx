"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Printer, Trash2 } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import {
  downloadTransportDocumentPdf,
  printTransportDocumentPdf,
  transportDocumentsApi,
} from "@/lib/api";
import {
  TRANSPORT_STATUS_LABELS,
  TRANSPORT_STATUS_STYLES,
  transportCarrierLabel,
  transportReasonLabel,
} from "@/lib/transport-document";
import { cn, formatDate } from "@/lib/utils";

export default function TransportDocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["transport-document", id],
    queryFn: () => transportDocumentsApi.get(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => transportDocumentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport-documents"] });
      router.push(routes.printDdt);
    },
  });

  return (
    <>
      <WorkspaceHeader title="Dettaglio DDT" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link
          href={routes.printDdt}
          className="mb-4 inline-block text-sm text-primary hover:underline"
        >
          ← Elenco DDT
        </Link>

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento…</p>
        ) : isError || !data ? (
          <p className="text-destructive">DDT non trovato.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-muted-foreground">
                  {data.number}
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {data.client?.companyName ||
                    data.client?.contactName ||
                    "Documento di trasporto"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      TRANSPORT_STATUS_STYLES[data.status]
                    )}
                  >
                    {TRANSPORT_STATUS_LABELS[data.status] || data.status}
                  </span>
                  <span>{formatDate(data.issueDate)}</span>
                  <span>{transportReasonLabel(data.reason)}</span>
                  <span>{transportCarrierLabel(data.carrier)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => printTransportDocumentPdf(id)}
                >
                  <Printer className="h-4 w-4" /> Stampa
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadTransportDocumentPdf(id, `${data.number}.pdf`)
                  }
                >
                  <Download className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" asChild>
                  <Link href={routes.printDdtEdit(id)}>
                    <Pencil className="h-4 w-4" /> Modifica
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    if (
                      !window.confirm(`Eliminare il DDT ${data.number}?`)
                    ) {
                      return;
                    }
                    deleteMut.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-2 p-4 text-sm">
                  <p className="font-medium">Destinatario</p>
                  <p>{data.recipientName || "—"}</p>
                  <p className="text-muted-foreground">
                    {[
                      data.recipientAddress,
                      data.recipientPostalCode,
                      data.recipientCity,
                      data.recipientProvince,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                  {data.recipientVat && <p>P.IVA: {data.recipientVat}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 p-4 text-sm">
                  <p className="font-medium">Destinazione / trasporto</p>
                  <p className="text-muted-foreground">
                    {[
                      data.destinationAddress,
                      data.destinationPostalCode,
                      data.destinationCity,
                      data.destinationProvince,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Come destinatario"}
                  </p>
                  {data.vehiclePlate && <p>Targa: {data.vehiclePlate}</p>}
                  {data.driverName && <p>Autista: {data.driverName}</p>}
                  {data.carrierName && <p>Vettore: {data.carrierName}</p>}
                  {data.packagesCount != null && (
                    <p>Colli: {data.packagesCount}</p>
                  )}
                  {data.grossWeightKg != null && (
                    <p>Peso: {Number(data.grossWeightKg)} kg</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left">Descrizione</th>
                      <th className="px-4 py-3 text-right">Q.tà</th>
                      <th className="px-4 py-3 text-left">U.M.</th>
                      <th className="px-4 py-3 text-left">SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border/60">
                        <td className="px-4 py-3">
                          <p>{line.description}</p>
                          {line.notes && (
                            <p className="text-xs text-muted-foreground">
                              {line.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {Number(line.quantity)}
                        </td>
                        <td className="px-4 py-3">{line.unit}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {line.sku || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {data.notes && (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                  {data.notes}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
