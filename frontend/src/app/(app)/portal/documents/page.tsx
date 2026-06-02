"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Receipt } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PortalDocumentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-documents"],
    queryFn: portalApi.documents,
  });

  return (
    <>
      <Header title="Documenti" />
      <div className="p-6 space-y-6">
        <Link href="/portal" className="text-sm text-primary hover:underline">
          ← Area cliente
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Preventivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Caricamento…</p>
            ) : !data?.quotes?.length ? (
              <p className="text-sm text-muted-foreground">Nessun preventivo.</p>
            ) : (
              <ul className="space-y-2">
                {data.quotes.map((q) => (
                  <li key={q.id}>
                    <Link
                      href="/portal/quotes"
                      className="flex justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/30"
                    >
                      <span>{q.number}</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(Number(q.total))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Bozze fattura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Documenti non validi ai fini fiscali.
            </p>
            {isLoading ? (
              <p className="text-muted-foreground">Caricamento…</p>
            ) : !data?.invoices?.length ? (
              <p className="text-sm text-muted-foreground">Nessuna bozza.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex justify-between border-b border-border pb-2"
                  >
                    <span className="font-mono text-xs">
                      {inv.number || "BOZZA"}
                    </span>
                    <span>{formatDate(inv.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
