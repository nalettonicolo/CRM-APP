"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Download, Mail, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  DetailBack,
  DetailField,
  DetailSection,
} from "@/components/detail/detail-shell";
import { downloadReportPdf, reportsApi } from "@/lib/api";
import { reportStatusLabels } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SUBMITTED: "bg-blue-500/15 text-blue-700",
  APPROVED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
};

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const [pdfBusy, setPdfBusy] = useState(false);

  const sendEmail = useMutation({
    mutationFn: () => reportsApi.sendEmail(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report", id] }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report", id],
    queryFn: () => reportsApi.get(id),
  });

  return (
    <>
      <Header title="Dettaglio report" />
      <div className="p-6">
        <DetailBack href="/reports" label="Torna ai report" />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !data ? (
          <p className="text-destructive">Report non trovato.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">{data.number}</p>
                  <h1 className="text-2xl font-bold tracking-tight">Report intervento</h1>
                  {data.client && (
                    <Link
                      href={`/clients/${data.client.id}`}
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      {data.client.companyName || data.client.contactName || "Cliente"}
                    </Link>
                  )}
                  {data.intervention && (
                    <Link
                      href={`/interventions/${data.intervention.id}`}
                      className="mt-1 block text-xs text-muted-foreground hover:text-primary"
                    >
                      Intervento {data.intervention.number} — {data.intervention.title}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pdfBusy}
                    onClick={async () => {
                      setPdfBusy(true);
                      try {
                        await downloadReportPdf(id, `report-${data.number}.pdf`);
                      } finally {
                        setPdfBusy(false);
                      }
                    }}
                  >
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sendEmail.isPending}
                    onClick={() => sendEmail.mutate()}
                  >
                    <Mail className="h-4 w-4" />
                    {sendEmail.isPending ? "Invio…" : "Invia email"}
                  </Button>
                  {data.status === "DRAFT" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/reports/${id}/edit`}>
                        <Pencil className="h-4 w-4" /> Modifica
                      </Link>
                    </Button>
                  )}
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium",
                    statusColors[data.status] || statusColors.DRAFT
                  )}
                >
                  {reportStatusLabels[data.status] || data.status}
                </span>
              </div>
            </div>

            <DetailSection title="Riepilogo">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Ore lavorate" value={`${Number(data.workHours)} h`} />
                <DetailField
                  label="Creato"
                  value={data.createdAt ? formatDate(data.createdAt) : undefined}
                />
                <DetailField
                  label="Inviato"
                  value={data.submittedAt ? formatDate(data.submittedAt) : undefined}
                />
                {data.technician && (
                  <DetailField
                    label="Tecnico"
                    value={`${data.technician.firstName} ${data.technician.lastName}`}
                  />
                )}
              </div>
            </DetailSection>

            {data.description && (
              <DetailSection title="Descrizione">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {data.description}
                </p>
              </DetailSection>
            )}

            {data.materials && data.materials.length > 0 && (
              <DetailSection title="Materiali">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Nome</th>
                      <th className="pb-2 font-medium text-right">Quantità</th>
                      <th className="pb-2 font-medium text-right">Unità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.materials.map((m) => (
                      <tr key={m.id} className="border-b border-border/60">
                        <td className="py-2">{m.name}</td>
                        <td className="py-2 text-right tabular-nums">{Number(m.quantity)}</td>
                        <td className="py-2 text-right">{m.unit || "pz"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DetailSection>
            )}
          </div>
        )}
      </div>
    </>
  );
}
