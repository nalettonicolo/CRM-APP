"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { ReportPreviewStep } from "@/components/reports/report-preview-step";
import { ReportSignStep } from "@/components/reports/report-sign-step";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { downloadReportPdf, reportsApi } from "@/lib/api";
import { reportStatusLabels } from "@/lib/labels";
import { DOCUMENT_COPY } from "@/lib/document-copy";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [draftView, setDraftView] = useState<"detail" | "preview" | "sign">("detail");
  const [banner, setBanner] = useState(() => searchParams.get("notice") || "");

  const deleteReport = useMutation({
    mutationFn: () => reportsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      router.push("/reports");
    },
    onError: (e: Error) => setBanner(e.message || "Eliminazione non riuscita."),
  });

  const sendEmail = useMutation({
    mutationFn: () => reportsApi.sendEmail(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["report", id] });
      setBanner(res.message || DOCUMENT_COPY.report.emailSentSuccess);
      setTimeout(() => setBanner(""), 5000);
    },
    onError: (e: Error) => setBanner(e.message || "Invio email non riuscito."),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report", id],
    queryFn: () => reportsApi.get(id),
  });

  return (
    <>
      <Header title={DOCUMENT_COPY.report.detailTitle} />
      <div className="p-6">
        <DetailBack href="/reports" label={DOCUMENT_COPY.report.detailBack} />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !data ? (
          <p className="text-destructive">{DOCUMENT_COPY.report.notFound}</p>
        ) : draftView === "preview" ? (
          <div className="max-w-3xl space-y-4">
            <ReportPreviewStep
              report={data}
              onSign={() => setDraftView("sign")}
              onSaveLater={() => setDraftView("detail")}
              onEdit={() => router.push(`/reports/${id}/edit`)}
            />
          </div>
        ) : draftView === "sign" ? (
          <div className="max-w-lg">
            <ReportSignStep
              reportId={id}
              clientEmail={data.client?.email}
              initialTechnicianSignature={data.technicianSignature}
              initialClientSignature={data.clientSignature}
              onBack={() => setDraftView("preview")}
              onDone={(message) => {
                qc.invalidateQueries({ queryKey: ["report", id] });
                qc.invalidateQueries({ queryKey: ["reports"] });
                setDraftView("detail");
                if (message) setBanner(message);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {banner && (
              <p
                className={cn(
                  "rounded-lg px-4 py-2 text-sm",
                  banner.includes("non") &&
                    (banner.includes("email") || banner.includes("SMTP") || banner.includes("fallito"))
                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                    : banner.includes("fallito") || banner.includes("Errore")
                      ? "border border-destructive/30 bg-destructive/10 text-destructive"
                      : "border border-primary/30 bg-primary/10 text-foreground"
                )}
              >
                {banner}
              </p>
            )}
            {data.status === "DRAFT" && (
              <div className="flex flex-wrap gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="w-full text-sm text-muted-foreground">
                  Bozza salvata: visualizza l&apos;anteprima prima di firmare e inviare.
                </p>
                <Button size="sm" onClick={() => setDraftView("preview")}>
                  Anteprima e firma
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/reports/${id}/edit`}>
                    <Pencil className="h-4 w-4" /> Modifica dati
                  </Link>
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">{data.number}</p>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {DOCUMENT_COPY.report.detailTitle}
                  </h1>
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
                  {data.quote && (
                    <Link
                      href={`/quotes/${data.quote.id}`}
                      className="mt-1 block text-xs text-muted-foreground hover:text-primary"
                    >
                      Preventivo {data.quote.number}
                      {data.quote.title ? ` — ${data.quote.title}` : ""}
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
                    disabled={sendEmail.isPending || !data.client?.email}
                    title={
                      data.client?.email
                        ? undefined
                        : "Aggiungi email nella scheda cliente"
                    }
                    onClick={() => {
                      if (
                        data.submittedAt &&
                        !window.confirm(DOCUMENT_COPY.report.resendConfirm)
                      ) {
                        return;
                      }
                      sendEmail.mutate();
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    {sendEmail.isPending
                      ? "Invio…"
                      : data.submittedAt
                        ? DOCUMENT_COPY.report.resendEmail
                        : "Invia email"}
                  </Button>
                  {data.status === "DRAFT" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/reports/${id}/edit`}>
                        <Pencil className="h-4 w-4" /> Modifica
                      </Link>
                    </Button>
                  )}
                  <DeleteEntityButton
                    size="sm"
                    pending={deleteReport.isPending}
                    confirmMessage={`Eliminare il verbale ${data.number}? L'operazione non è reversibile.`}
                    onConfirm={() => deleteReport.mutate()}
                  />
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
                {Number(data.kmTraveled) > 0 && (
                  <DetailField
                    label="Km percorsi"
                    value={`${Number(data.kmTraveled)} km`}
                  />
                )}
                {(Number(data.expensesAmount) > 0 || data.expensesNotes) && (
                  <DetailField
                    label="Costi sostenuti"
                    value={
                      Number(data.expensesAmount) > 0
                        ? `€ ${Number(data.expensesAmount).toFixed(2)}`
                        : data.expensesNotes || "—"
                    }
                  />
                )}
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
