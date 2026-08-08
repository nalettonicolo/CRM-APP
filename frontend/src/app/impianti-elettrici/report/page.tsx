"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, dailyReportsApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { formatDate } from "@/lib/utils";

export default function IeDailyReportsPage() {
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [workDate, setWorkDate] = useState("");
  const [description, setDescription] = useState("");
  const [workHours, setWorkHours] = useState("0");
  const [blockCalendar, setBlockCalendar] = useState(false);
  const [error, setError] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["daily-reports", onlyUnlinked],
    queryFn: () => dailyReportsApi.list({ unlinked: onlyUnlinked || undefined }),
  });

  const createMut = useMutation({
    mutationFn: (allowOverlap: boolean) =>
      dailyReportsApi.create({
        workDate: workDate
          ? new Date(`${workDate}T12:00:00`).toISOString()
          : new Date().toISOString(),
        description: description || undefined,
        workHours: Number(workHours) || 0,
        status: "DRAFT",
        blockCalendar: blockCalendar || undefined,
        allowOverlap: allowOverlap || undefined,
      }),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ["daily-reports"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      setDescription("");
      window.location.href = routes.dailyReport(report.id);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.code === "SCHEDULE_CONFLICT") {
        const ok = window.confirm(`${err.message}\n\nForzare sul calendario?`);
        if (ok) createMut.mutate(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Errore");
    },
  });

  return (
    <>
      <IeHeader title="Report giornalieri" />
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-slate-400">
            Puoi creare un report vuoto e collegarlo dopo a una commessa, oppure
            partire dalla scheda commessa.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={onlyUnlinked ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyUnlinked((v) => !v)}
            >
              {onlyUnlinked ? "Solo senza commessa" : "Tutti"}
            </Button>
            <Button
              onClick={() => {
                setWorkDate("");
                setDescription("");
                setWorkHours("0");
                setBlockCalendar(false);
                setError("");
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Crea report vuoto
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-slate-400">Caricamento…</p>
        ) : reports.length === 0 ? (
          <p className="text-slate-400">Nessun report.</p>
        ) : (
          <div className="grid gap-3">
            {reports.map((r) => (
              <Link key={r.id} href={routes.dailyReport(r.id)}>
                <Card className="border-slate-800 bg-slate-900/50 transition hover:border-sky-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base text-slate-100">
                      <span>
                        <span className="mr-2 font-mono text-xs text-slate-500">
                          {r.number}
                        </span>
                        {formatDate(r.workDate)}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {r.jobOrder
                          ? r.jobOrder.number
                          : "Non collegato"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-400">
                    {Number(r.workHours)} h
                    {r.description ? ` — ${r.description}` : " — (vuoto)"}
                    {r.jobOrder?.title ? ` · ${r.jobOrder.title}` : ""}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo report giornaliero</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Lascia la commessa vuota: la colleghi dopo dalla scheda report.
            </p>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
            <Input
              type="number"
              min={0}
              step="0.5"
              placeholder="Ore"
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
            />
            <Input
              placeholder="Descrizione (opzionale)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={blockCalendar}
                onChange={(e) => setBlockCalendar(e.target.checked)}
              />
              Blocca il giorno sul calendario condiviso
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={createMut.isPending}
              onClick={() => {
                setError("");
                createMut.mutate(false);
              }}
            >
              Crea report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
