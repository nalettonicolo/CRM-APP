"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, ClipboardList, Wrench, Receipt } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PortalPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: portalApi.dashboard,
  });

  if (isLoading) {
    return (
      <>
        <Header title="Area Cliente" />
        <p className="p-6 text-muted-foreground">Caricamento...</p>
      </>
    );
  }

  return (
    <>
      <Header title="Area Cliente" />
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-6"
        >
          <h2 className="text-lg font-semibold">Benvenuto nella tua area privata</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consulta preventivi, report, interventi e documenti.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Preventivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data?.quotes?.map((q) => (
                  <li key={q.id} className="flex justify-between text-sm border-b border-border pb-2">
                    <span>{q.number} — {q.title || "Preventivo"}</span>
                    <span className="font-medium">{formatCurrency(Number(q.total))}</span>
                  </li>
                )) ?? <li className="text-muted-foreground text-sm">Nessun preventivo</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data?.reports?.map((r) => (
                  <li key={r.id} className="flex justify-between text-sm border-b border-border pb-2">
                    <span>{r.number}</span>
                    <span className="text-muted-foreground">{r.status}</span>
                  </li>
                )) ?? <li className="text-muted-foreground text-sm">Nessun report</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Interventi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data?.interventions?.map((i) => (
                  <li key={i.id} className="text-sm border-b border-border pb-2">
                    <span className="font-medium">{i.title}</span>
                    {i.scheduledAt && (
                      <span className="float-right text-muted-foreground">
                        {formatDate(i.scheduledAt)}
                      </span>
                    )}
                  </li>
                )) ?? <li className="text-muted-foreground text-sm">Nessun intervento</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Bozze fattura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Documenti non validi ai fini fiscali. Non sostituiscono fattura elettronica.
              </p>
              {data?.invoices?.length ? (
                <ul className="space-y-2 text-sm">
                  {(data.invoices as { id: string; number: string }[]).map((inv) => (
                    <li key={inv.id}>{inv.number}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna bozza disponibile</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
