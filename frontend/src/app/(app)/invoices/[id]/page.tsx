"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Receipt, Save } from "lucide-react";
import { Header } from "@/components/layout/header";
import { DetailBack, DetailField, DetailSection } from "@/components/detail/detail-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadInvoicePdf, invoicesApi } from "@/lib/api";
import { paymentStatusLabels } from "@/lib/labels";
import { DOCUMENT_COPY, INVOICE_COURTESY_DISCLAIMER } from "@/lib/document-copy";
import { formatCurrency, formatDate } from "@/lib/utils";

const textareaClass =
  "flex min-h-[96px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

function dateInputToIso(value: string): string | undefined {
  return value ? `${value}T12:00:00.000Z` : undefined;
}

export default function InvoiceDetailPage() {
  const id = useParams().id as string;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    subtotal: "",
    vatAmount: "",
    total: "",
    depositAmount: "",
    balanceDue: "",
    paymentStatus: "UNPAID",
    createdAt: "",
    dueDate: "",
    notes: "",
    disclaimer: INVOICE_COURTESY_DISCLAIMER,
  });
  const [banner, setBanner] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoicesApi.get(id),
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      subtotal: String(Number(data.subtotal)),
      vatAmount: String(Number(data.vatAmount)),
      total: String(Number(data.total)),
      depositAmount: String(Number(data.depositAmount ?? 0)),
      balanceDue: String(Number(data.balanceDue)),
      paymentStatus: data.paymentStatus || "UNPAID",
      createdAt: data.createdAt ? data.createdAt.slice(0, 10) : "",
      dueDate: data.dueDate ? data.dueDate.slice(0, 10) : "",
      notes: data.notes || "",
      disclaimer: data.disclaimer || INVOICE_COURTESY_DISCLAIMER,
    });
  }, [data]);

  const update = useMutation({
    mutationFn: () =>
      invoicesApi.update(id, {
        subtotal: Number(form.subtotal) || 0,
        vatAmount: Number(form.vatAmount) || 0,
        total: Number(form.total) || 0,
        depositAmount: Number(form.depositAmount) || 0,
        balanceDue: Number(form.balanceDue) || 0,
        paymentStatus: form.paymentStatus,
        createdAt: dateInputToIso(form.createdAt),
        dueDate: form.dueDate ? `${form.dueDate}T12:00:00.000Z` : null,
        notes: form.notes.trim() || null,
        disclaimer: form.disclaimer.trim() || INVOICE_COURTESY_DISCLAIMER,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setBanner("Documento aggiornato.");
      setTimeout(() => setBanner(""), 2500);
    },
    onError: () => setBanner("Errore durante il salvataggio."),
  });

  return (
    <>
      <Header title={DOCUMENT_COPY.invoice.detailTitle} />
      <div className="p-6">
        <DetailBack href="/invoices" label={DOCUMENT_COPY.invoice.detailBack} />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !data ? (
          <p className="text-destructive">{DOCUMENT_COPY.invoice.notFound}</p>
        ) : (
          <div className="space-y-6">
            {banner && (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
                {banner}
              </p>
            )}
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
                    {DOCUMENT_COPY.invoice.fromQuotePrefix} {data.quote.number}
                  </Link>
                )}
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadInvoicePdf(id, `documento-${data.number}.pdf`)}
                >
                  <Download className="h-4 w-4" />
                  Scarica PDF
                </Button>
              </div>
            </div>

            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              {data.disclaimer || INVOICE_COURTESY_DISCLAIMER}
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
                  label="Data emissione"
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

            <DetailSection title="Modifica documento">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Imponibile</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.subtotal}
                    onChange={(e) => setForm((f) => ({ ...f, subtotal: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">IVA</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.vatAmount}
                    onChange={(e) => setForm((f) => ({ ...f, vatAmount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Totale</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.total}
                    onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Acconto</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.depositAmount}
                    onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Saldo</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.balanceDue}
                    onChange={(e) => setForm((f) => ({ ...f, balanceDue: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Pagamento</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={form.paymentStatus}
                    onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}
                  >
                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Scadenza</label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Data emissione</label>
                  <Input
                    type="date"
                    value={form.createdAt}
                    onChange={(e) => setForm((f) => ({ ...f, createdAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Note</label>
                  <textarea
                    className={textareaClass}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Note interne o testo da mostrare nel PDF"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Disclaimer</label>
                  <textarea
                    className={textareaClass}
                    value={form.disclaimer}
                    onChange={(e) => setForm((f) => ({ ...f, disclaimer: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={update.isPending} onClick={() => update.mutate()}>
                  <Save className="h-4 w-4" />
                  {update.isPending ? "Salvataggio..." : "Salva modifiche"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadInvoicePdf(id, `documento-${data.number}.pdf`)}
                >
                  <Download className="h-4 w-4" />
                  Scarica PDF aggiornato
                </Button>
              </div>
            </DetailSection>
          </div>
        )}
      </div>
    </>
  );
}
