"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { Header } from "@/components/layout/header";
import { DetailBack, DetailField, DetailSection } from "@/components/detail/detail-shell";
import { invoicesApi } from "@/lib/api";
import { paymentStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const id = useParams().id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoicesApi.get(id),
  });

  return (
    <>
      <Header title="Dettaglio fattura" />
      <div className="p-6">
        <DetailBack href="/invoices" label="Torna alle fatture" />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !data ? (
          <p className="text-destructive">Fattura non trovata.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-6">
              <div className="rounded-xl bg-primary/10 p-3">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-mono text-sm text-muted-foreground">{data.number}</p>
                <h1 className="text-2xl font-bold">Bozza fattura</h1>
                {data.client && (
                  <Link
                    href={`/clients/${data.clientId}`}
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    {data.client.companyName || data.client.contactName}
                  </Link>
                )}
                {data.quote && (
                  <Link
                    href={`/quotes/${data.quoteId}`}
                    className="mt-1 block text-xs text-muted-foreground hover:text-primary"
                  >
                    Da preventivo {data.quote.number}
                  </Link>
                )}
              </div>
            </div>

            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              {data.disclaimer ||
                "Documento non valido ai fini fiscali. Non sostituisce fattura elettronica."}
            </p>

            <DetailSection title="Importi">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailField label="Imponibile" value={formatCurrency(Number(data.subtotal))} />
                <DetailField label="IVA" value={formatCurrency(Number(data.vatAmount))} />
                <DetailField label="Totale" value={formatCurrency(Number(data.total))} />
                <DetailField
                  label="Saldo"
                  value={formatCurrency(Number(data.balanceDue))}
                />
                <DetailField
                  label="Pagamento"
                  value={paymentStatusLabels[data.paymentStatus] || data.paymentStatus}
                />
                <DetailField
                  label="Scadenza"
                  value={data.dueDate ? formatDate(data.dueDate) : "—"}
                />
                <DetailField
                  label="Creato"
                  value={formatDate(data.createdAt)}
                />
              </div>
            </DetailSection>

            {data.notes && (
              <DetailSection title="Note">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {data.notes}
                </p>
              </DetailSection>
            )}
          </div>
        )}
      </div>
    </>
  );
}
