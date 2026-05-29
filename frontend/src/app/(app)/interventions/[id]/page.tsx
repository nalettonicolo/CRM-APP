"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import {
  DetailBack,
  DetailField,
  DetailSection,
} from "@/components/detail/detail-shell";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { interventionsApi } from "@/lib/api";
import { interventionStatusLabels } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-500/15 text-blue-700",
  IN_PROGRESS: "bg-amber-500/15 text-amber-700",
  COMPLETED: "bg-green-500/15 text-green-700",
  CANCELLED: "bg-red-500/15 text-red-600",
};

export default function InterventionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();

  const deleteIntervention = useMutation({
    mutationFn: () => interventionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interventions"] });
      router.push("/interventions");
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["intervention", id],
    queryFn: () => interventionsApi.get(id),
  });

  return (
    <>
      <Header title="Dettaglio intervento" />
      <div className="p-6">
        <DetailBack href="/interventions" label="Torna agli interventi" />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !data ? (
          <p className="text-destructive">Intervento non trovato.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">{data.number}</p>
                  <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
                  {data.client && (
                    <Link
                      href={`/clients/${data.client.id}`}
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      {data.client.companyName ||
                        data.client.contactName ||
                        "Cliente"}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <DeleteEntityButton
                  pending={deleteIntervention.isPending}
                  confirmMessage={`Eliminare l'intervento ${data.number} e i verbali collegati? L'operazione non è reversibile.`}
                  onConfirm={() => deleteIntervention.mutate()}
                />
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium",
                    statusColors[data.status] || statusColors.SCHEDULED
                  )}
                >
                  {interventionStatusLabels[data.status] || data.status}
                </span>
              </div>
            </div>

            <DetailSection title="Pianificazione">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label="Programmato"
                  value={data.scheduledAt ? formatDate(data.scheduledAt) : undefined}
                />
                <DetailField
                  label="Inizio"
                  value={data.startedAt ? formatDate(data.startedAt) : undefined}
                />
                <DetailField
                  label="Completato"
                  value={data.completedAt ? formatDate(data.completedAt) : undefined}
                />
                <DetailField label="Luogo" value={data.location} />
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

            <DetailSection title="Report">
              <p className="mb-3 text-sm text-muted-foreground">
                Compila il verbale, salva l&apos;anteprima, poi firma o lascia in
                bozza per dopo.
              </p>
              <Button asChild size="sm" className="mb-4">
                <Link href={`/reports/new?interventionId=${id}`}>
                  <FilePlus className="h-4 w-4" /> Crea report da intervento
                </Link>
              </Button>
              {data.reports && data.reports.length > 0 ? (
                <ul className="divide-y divide-border">
                  {data.reports.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/reports/${r.id}`}
                        className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 text-sm hover:bg-muted/30"
                      >
                        <span className="font-mono">{r.number}</span>
                        <span className="text-muted-foreground">
                          {r.status} · {Number(r.workHours)}h
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nessun report ancora collegato a questo intervento.
                </p>
              )}
            </DetailSection>
          </div>
        )}
      </div>
    </>
  );
}
