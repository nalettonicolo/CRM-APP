"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/components/ui/field-label";
import { dailyReportsApi, jobOrdersApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { formatDate } from "@/lib/utils";

export default function IeDailyReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [jobOrderId, setJobOrderId] = useState("");
  const [description, setDescription] = useState("");
  const [workHours, setWorkHours] = useState("0");
  const [notes, setNotes] = useState("");
  const [banner, setBanner] = useState("");

  const { data: report, isLoading } = useQuery({
    queryKey: ["daily-report", id],
    queryFn: () => dailyReportsApi.get(id),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["job-orders", "link"],
    queryFn: () => jobOrdersApi.list(),
  });

  useEffect(() => {
    if (!report) return;
    setJobOrderId(report.jobOrderId || "");
    setDescription(report.description || "");
    setWorkHours(String(Number(report.workHours) || 0));
    setNotes(report.notes || "");
  }, [report]);

  const saveMut = useMutation({
    mutationFn: () =>
      dailyReportsApi.update(id, {
        jobOrderId: jobOrderId || null,
        description: description || null,
        workHours: Number(workHours) || 0,
        notes: notes || null,
        status: "SUBMITTED",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-report", id] });
      qc.invalidateQueries({ queryKey: ["daily-reports"] });
      qc.invalidateQueries({ queryKey: ["job-orders"] });
      if (jobOrderId) {
        qc.invalidateQueries({ queryKey: ["job-order", jobOrderId] });
      }
      setBanner(
        jobOrderId
          ? "Report salvato e collegato alla commessa."
          : "Report salvato (senza commessa)."
      );
    },
    onError: (err: unknown) =>
      setBanner(err instanceof Error ? err.message : "Errore salvataggio"),
  });

  return (
    <>
      <IeHeader title="Report giornaliero" />
      <div className="p-4 sm:p-6 space-y-4">
        <Link
          href={routes.dailyReports}
          className="text-sm text-sky-400 hover:underline"
        >
          ← Elenco report
        </Link>

        {isLoading || !report ? (
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
                    {report.number}
                  </span>
                  {formatDate(report.workDate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Collegamento commessa
                  </label>
                  <select
                    className={appSelectClass}
                    value={jobOrderId}
                    onChange={(e) => setJobOrderId(e.target.value)}
                  >
                    <option value="">— Nessuna (collega dopo) —</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.number} — {j.title}
                        {j.client?.companyName || j.client?.contactName
                          ? ` (${j.client.companyName || j.client.contactName})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {report.jobOrder && (
                    <p className="mt-1 text-xs text-slate-500">
                      Attuale:{" "}
                      <Link
                        href={routes.jobOrder(report.jobOrder.id)}
                        className="text-sky-400 hover:underline"
                      >
                        {report.jobOrder.number} — {report.jobOrder.title}
                      </Link>
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Ore</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Descrizione
                  </label>
                  <textarea
                    className="min-h-[96px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Lavoro svolto…"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Note</label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Note interne"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={saveMut.isPending}
                    onClick={() => saveMut.mutate()}
                  >
                    Salva
                    {jobOrderId && !report.jobOrderId
                      ? " e collega alla commessa"
                      : ""}
                  </Button>
                  {jobOrderId && (
                    <Button variant="outline" asChild>
                      <Link href={routes.jobOrder(jobOrderId)}>
                        Apri commessa
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
