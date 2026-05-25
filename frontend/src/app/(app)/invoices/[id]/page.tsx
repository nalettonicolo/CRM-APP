"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Receipt, Save, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { DetailBack, DetailField, DetailSection } from "@/components/detail/detail-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  downloadInvoicePdf,
  interventionsApi,
  invoicesApi,
  type InvoiceLineItem,
  type Report,
} from "@/lib/api";
import { paymentStatusLabels } from "@/lib/labels";
import { DOCUMENT_COPY, INVOICE_COURTESY_DISCLAIMER } from "@/lib/document-copy";
import { formatCurrency, formatDate } from "@/lib/utils";

const textareaClass =
  "flex min-h-[96px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

function dateInputToIso(value: string): string | undefined {
  return value ? `${value}T12:00:00.000Z` : undefined;
}

function lineTotal(item: InvoiceLineItem): number {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

function emptyLine(): InvoiceLineItem {
  return {
    description: "",
    quantity: 1,
    unit: "",
    unitPrice: 0,
    vatRate: 0,
    total: 0,
  };
}

function linesFromQuote(items?: InvoiceLineItem[]): InvoiceLineItem[] {
  return (items ?? []).map((item) => ({
    description: item.description,
    quantity: Number(item.quantity) || 0,
    unit: item.unit || "",
    unitPrice: Number(item.unitPrice) || 0,
    vatRate: Number(item.vatRate ?? 0) || 0,
    total: Number(item.total) || lineTotal(item),
  }));
}

function linesFromReport(report: Report): InvoiceLineItem[] {
  const rows: InvoiceLineItem[] = [];
  if (report.description?.trim()) {
    rows.push({
      description: `Report ${report.number} — ${report.description.trim()}`,
      quantity: 1,
      unit: "",
      unitPrice: 0,
      vatRate: 0,
      total: 0,
    });
  }
  for (const item of report.checklist ?? []) {
    if (!item.label?.trim()) continue;
    rows.push({
      description: `Report ${report.number} — ${item.label.trim()}`,
      quantity: 1,
      unit: "",
      unitPrice: 0,
      vatRate: 0,
      total: 0,
    });
  }
  for (const material of report.materials ?? []) {
    rows.push({
      description: `Materiale report ${report.number} — ${material.name}`,
      quantity: Number(material.quantity) || 0,
      unit: material.unit || "pz",
      unitPrice: 0,
      vatRate: 0,
      total: 0,
    });
  }
  if (Number(report.expensesAmount ?? 0) > 0 || report.expensesNotes?.trim()) {
    rows.push({
      description: `Costi report ${report.number}${report.expensesNotes ? ` — ${report.expensesNotes}` : ""}`,
      quantity: 1,
      unit: "",
      unitPrice: Number(report.expensesAmount ?? 0) || 0,
      vatRate: 0,
      total: Number(report.expensesAmount ?? 0) || 0,
    });
  }
  return rows;
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
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [reportId, setReportId] = useState("");
  const [banner, setBanner] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoicesApi.get(id),
  });

  const { data: reports } = useQuery({
    queryKey: ["reports", "for-invoice", data?.quoteId, data?.clientId],
    queryFn: interventionsApi.reports,
    enabled: Boolean(data),
  });

  const relatedReports =
    reports?.filter((report) =>
      data?.quoteId ? report.quoteId === data.quoteId : report.clientId === data?.clientId
    ) ?? [];

  const calculatedTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
    const vatAmount = items.reduce(
      (sum, item) => sum + (lineTotal(item) * (Number(item.vatRate ?? 0) || 0)) / 100,
      0
    );
    const total = subtotal + vatAmount;
    const depositAmount = Number(form.depositAmount) || 0;
    return {
      subtotal,
      vatAmount,
      total,
      balanceDue: Math.max(total - depositAmount, 0),
    };
  }, [form.depositAmount, items]);

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
    setItems(
      data.items?.length
        ? linesFromQuote(data.items)
        : linesFromQuote(data.quote?.items)
    );
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
        items: items
          .filter((item) => item.description.trim())
          .map((item) => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            vatRate: Number(item.vatRate ?? 0) || 0,
            total: lineTotal(item),
          })),
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

  function updateItem(index: number, patch: Partial<InvoiceLineItem>) {
    setItems((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        return { ...next, total: lineTotal(next) };
      })
    );
  }

  function applyCalculatedTotals() {
    setForm((f) => ({
      ...f,
      subtotal: calculatedTotals.subtotal.toFixed(2),
      vatAmount: calculatedTotals.vatAmount.toFixed(2),
      total: calculatedTotals.total.toFixed(2),
      balanceDue: calculatedTotals.balanceDue.toFixed(2),
    }));
  }

  function importQuoteItems() {
    const rows = linesFromQuote(data?.quote?.items);
    if (rows.length === 0) {
      setBanner("Il preventivo non contiene voci importabili.");
      return;
    }
    setItems(rows);
    setBanner("Voci preventivo importate.");
  }

  function importReportItems() {
    const report = relatedReports.find((r) => r.id === reportId);
    if (!report) return;
    const rows = linesFromReport(report);
    if (rows.length === 0) {
      setBanner("Il report selezionato non contiene voci importabili.");
      return;
    }
    setItems((current) => [...current, ...rows]);
    setReportId("");
    setBanner("Voci report aggiunte.");
  }

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
              <div className="mt-6 rounded-xl border border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                  <div>
                    <h3 className="font-semibold">Voci documento</h3>
                    <p className="text-xs text-muted-foreground">
                      Modifica le righe senza cambiare il preventivo originale.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={importQuoteItems}>
                      Importa preventivo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setItems((rows) => [...rows, emptyLine()])}
                    >
                      <Plus className="h-4 w-4" />
                      Riga
                    </Button>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="flex h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
                      value={reportId}
                      onChange={(e) => setReportId(e.target.value)}
                    >
                      <option value="">Importa voci da report…</option>
                      {relatedReports.map((report) => (
                        <option key={report.id} value={report.id}>
                          {report.number} — {formatDate(report.createdAt)}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!reportId}
                      onClick={importReportItems}
                    >
                      Aggiungi da report
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[860px] space-y-2">
                      <div className="grid grid-cols-[1fr_90px_90px_110px_90px_110px_44px] gap-2 px-1 text-xs font-medium uppercase text-muted-foreground">
                        <span>Descrizione</span>
                        <span>Q.tà</span>
                        <span>Unità</span>
                        <span>Prezzo</span>
                        <span>IVA %</span>
                        <span>Totale</span>
                        <span />
                      </div>
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[1fr_90px_90px_110px_90px_110px_44px] gap-2"
                        >
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, { description: e.target.value })
                            }
                            placeholder="Descrizione voce"
                          />
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={String(item.quantity)}
                            onChange={(e) =>
                              updateItem(index, { quantity: e.target.value })
                            }
                          />
                          <Input
                            value={item.unit || ""}
                            onChange={(e) => updateItem(index, { unit: e.target.value })}
                            placeholder="pz"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={String(item.unitPrice)}
                            onChange={(e) =>
                              updateItem(index, { unitPrice: e.target.value })
                            }
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={String(item.vatRate ?? 0)}
                            onChange={(e) =>
                              updateItem(index, { vatRate: e.target.value })
                            }
                          />
                          <Input value={lineTotal(item).toFixed(2)} readOnly />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setItems((rows) => rows.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                    <span>
                      Righe: {items.length} · Imponibile{" "}
                      {formatCurrency(calculatedTotals.subtotal)} · IVA{" "}
                      {formatCurrency(calculatedTotals.vatAmount)} · Totale{" "}
                      {formatCurrency(calculatedTotals.total)}
                    </span>
                    <Button type="button" variant="outline" onClick={applyCalculatedTotals}>
                      Ricalcola importi dalle righe
                    </Button>
                  </div>
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
