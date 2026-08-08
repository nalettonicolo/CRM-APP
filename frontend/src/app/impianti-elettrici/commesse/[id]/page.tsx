"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  invoicesApi,
  jobOrdersApi,
} from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { formatDate } from "@/lib/utils";

export default function IeJobOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const routes = useWorkspaceRoutes();
  const router = useRouter();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reportDate, setReportDate] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportHours, setReportHours] = useState("8");
  const [banner, setBanner] = useState("");

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-order", id],
    queryFn: () => jobOrdersApi.get(id),
  });

  const reports = useMemo(() => job?.dailyReports ?? [], [job]);

  const addReport = useMutation({
    mutationFn: (allowOverlap: boolean) =>
      jobOrdersApi.addReport(id, {
        workDate: reportDate
          ? new Date(`${reportDate}T12:00:00`).toISOString()
          : new Date().toISOString(),
        description: reportDesc || undefined,
        workHours: Number(reportHours) || 0,
        blockCalendar: true,
        allowOverlap: allowOverlap || undefined,
        status: "SUBMITTED",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-order", id] });
      qc.invalidateQueries({ queryKey: ["events"] });
      setReportDesc("");
      setBanner("Report giornaliero aggiunto.");
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.code === "SCHEDULE_CONFLICT") {
        const ok = window.confirm(`${err.message}\n\nForzare sul calendario?`);
        if (ok) addReport.mutate(true);
        return;
      }
      setBanner(err instanceof Error ? err.message : "Errore");
    },
  });

  const makeInvoice = useMutation({
    mutationFn: () =>
      invoicesApi.createFromJobOrder(id, Array.from(selected)),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      router.push(routes.invoice(inv.id));
    },
    onError: (err: unknown) =>
      setBanner(err instanceof Error ? err.message : "Errore documento"),
  });

  function toggle(reportId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  }

  return (
    <>
      <IeHeader title="Commessa" />
      <div className="p-4 sm:p-6 space-y-4">
        <Link href={routes.jobOrders} className="text-sm text-sky-400 hover:underline">
          ← Elenco commesse
        </Link>

        {isLoading || !job ? (
          <p className="text-slate-400">Caricamento…</p>
        ) : (
          <>
            {banner && (
              <p className="rounded-lg border border-sky-800/50 bg-sky-950/40 px-3 py-2 text-sm text-sky-100">
                {banner}
              </p>
            )}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  <span className="mr-2 font-mono text-sm text-slate-500">
                    {job.number}
                  </span>
                  {job.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-400">
                <p>
                  Cliente:{" "}
                  {job.client?.companyName || job.client?.contactName || "—"}
                </p>
                {job.workType && <p>Tipo: {job.workType}</p>}
                {job.location && <p>Luogo: {job.location}</p>}
                {job.plannedStart && (
                  <p>
                    Periodo: {formatDate(job.plannedStart)}
                    {job.plannedEnd ? ` → ${formatDate(job.plannedEnd)}` : ""}
                    {job.estimatedDays != null
                      ? ` (${job.estimatedDays} gg)`
                      : ""}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-base text-slate-100">
                  Report giornalieri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder="Ore"
                    value={reportHours}
                    onChange={(e) => setReportHours(e.target.value)}
                  />
                  <Input
                    className="sm:col-span-2"
                    placeholder="Descrizione lavoro del giorno"
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={addReport.isPending}
                  onClick={() => addReport.mutate(false)}
                >
                  Aggiungi report + blocca giorno in calendario
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={routes.dailyReports}>
                    Oppure crea report vuoto e collegalo dopo
                  </Link>
                </Button>

                {reports.length === 0 ? (
                  <p className="text-sm text-slate-500">Nessun report ancora.</p>
                ) : (
                  <div className="space-y-2">
                    {reports.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 cursor-pointer"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          aria-label={`Seleziona ${r.number}`}
                        />
                        <Link
                          href={routes.dailyReport(r.id)}
                          className="min-w-0 flex-1 text-slate-300 hover:text-sky-300"
                        >
                          <span className="font-mono text-xs text-slate-500">
                            {r.number}
                          </span>{" "}
                          {formatDate(r.workDate)} · {Number(r.workHours)} h
                          {r.description ? ` — ${r.description}` : " — (vuoto)"}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  disabled={selected.size === 0 || makeInvoice.isPending}
                  onClick={() => makeInvoice.mutate()}
                >
                  Crea documento di cortesia dai report selezionati
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
