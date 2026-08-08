"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientSearchSelect } from "@/components/clients/client-search-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, jobOrdersApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { formatDate } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  DRAFT: "Bozza",
  PLANNED: "Pianificata",
  IN_PROGRESS: "In corso",
  COMPLETED: "Completata",
  CANCELLED: "Annullata",
  INVOICED: "Documentata",
};

export default function IeJobOrdersPage() {
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [workType, setWorkType] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("1");
  const [location, setLocation] = useState("");
  const [scheduleDays, setScheduleDays] = useState(true);
  const [error, setError] = useState("");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["job-orders"],
    queryFn: () => jobOrdersApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (allowOverlap: boolean) => {
      const startIso = plannedStart
        ? new Date(`${plannedStart}T08:00:00`).toISOString()
        : undefined;
      const days = Number(estimatedDays) || 1;
      const endIso = startIso
        ? new Date(
            new Date(startIso).getTime() + (days - 1) * 24 * 60 * 60 * 1000
          ).toISOString()
        : undefined;
      return jobOrdersApi.create({
        clientId,
        title,
        workType: workType || undefined,
        plannedStart: startIso,
        plannedEnd: endIso,
        estimatedDays: days,
        location: location || undefined,
        scheduleDays,
        allowOverlap: allowOverlap || undefined,
      });
    },
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["job-orders"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      window.location.href = routes.jobOrder(job.id);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.code === "SCHEDULE_CONFLICT") {
        const ok = window.confirm(
          `${err.message}\n\nVuoi forzare comunque i giorni sul calendario condiviso?`
        );
        if (ok) createMut.mutate(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Errore");
    },
  });

  return (
    <>
      <IeHeader title="Commesse" />
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-slate-400">
            Commessa = lavoro commissionato dal cliente. Ogni giornata genera un
            report; a fine lavori selezioni i report nel documento di cortesia.
            I giorni si bloccano sul calendario condiviso con Nicolò Service.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nuova commessa
          </Button>
        </div>

        {isLoading ? (
          <p className="text-slate-400">Caricamento…</p>
        ) : jobs.length === 0 ? (
          <p className="text-slate-400">Nessuna commessa ancora.</p>
        ) : (
          <div className="grid gap-3">
            {jobs.map((job) => (
              <Link key={job.id} href={routes.jobOrder(job.id)}>
                <Card className="border-slate-800 bg-slate-900/50 transition hover:border-sky-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base text-slate-100">
                      <span>
                        <span className="mr-2 font-mono text-xs text-slate-500">
                          {job.number}
                        </span>
                        {job.title}
                      </span>
                      <span className="rounded-full bg-sky-950 px-2 py-0.5 text-xs text-sky-300">
                        {statusLabels[job.status] || job.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-400">
                    {job.client?.companyName || job.client?.contactName || "—"}
                    {job.plannedStart && (
                      <> · dal {formatDate(job.plannedStart)}</>
                    )}
                    {job.estimatedDays != null && (
                      <> · {job.estimatedDays} gg</>
                    )}
                    <> · {job._count?.dailyReports ?? job.dailyReports?.length ?? 0} report</>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Nuova commessa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-visible">
            <Input
              placeholder="Titolo lavoro *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <ClientSearchSelect
              value={clientId}
              onChange={(id) => setClientId(id)}
              placeholder="Cliente *"
              required
            />
            <Input
              placeholder="Tipo lavoro (es. impianto civile)"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
            />
            <Input
              placeholder="Luogo"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Inizio
                </label>
                <Input
                  type="date"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Giorni stimati
                </label>
                <Input
                  type="number"
                  min={1}
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scheduleDays}
                onChange={(e) => setScheduleDays(e.target.checked)}
              />
              Blocca i giorni sul calendario condiviso + crea report giornalieri
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={!title.trim() || !clientId || createMut.isPending}
              onClick={() => {
                setError("");
                createMut.mutate(false);
              }}
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
