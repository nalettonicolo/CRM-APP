"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Plus, Save, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { AttachmentPanel } from "@/components/files/attachment-panel";
import { DetailBack } from "@/components/detail/detail-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  downloadInvoicePdf,
  interventionsApi,
  invoicesApi,
  type InvoiceDiscount,
  type InvoiceLineItem,
} from "@/lib/api";
import { paymentStatusLabels, SERVICE_UNIT_OPTIONS } from "@/lib/labels";
import {
  DOCUMENT_COPY,
  INVOICE_COURTESY_DISCLAIMER,
  formatInvoiceDocumentNumber,
} from "@/lib/document-copy";
import {
  calculateInvoiceTotals,
  dateInputToIso,
  discountDeduction,
  emptyDiscount,
  emptyLine,
  formatDecimal,
  lineTotal,
  linesFromQuote,
  linesFromReport,
  parseDecimal,
  parseInvoiceDiscounts,
} from "@/lib/invoice-line-items";
import { formatCurrency, formatDate } from "@/lib/utils";

const textareaClass =
  "flex min-h-[96px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export default function InvoiceEditPage() {
  const id = useParams().id as string;
  const router = useRouter();
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
    showWebsite: true,
    showQuoteRef: true,
  });
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [discounts, setDiscounts] = useState<InvoiceDiscount[]>([]);
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

  const calculatedTotals = useMemo(
    () =>
      calculateInvoiceTotals(
        items,
        discounts.filter((d) => d.description.trim() && d.value > 0),
        Number(form.depositAmount) || 0
      ),
    [discounts, form.depositAmount, items]
  );

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
      showWebsite: data.showWebsite !== false,
      showQuoteRef: data.showQuoteRef !== false,
    });
    setItems(
      data.items?.length
        ? linesFromQuote(data.items)
        : linesFromQuote(data.quote?.items)
    );
    setDiscounts(parseInvoiceDiscounts(data.discounts));
  }, [data]);

  const canEditCreatedAt = data?.canEditCreatedAt !== false;

  const update = useMutation({
    mutationFn: () =>
      invoicesApi.update(id, {
        subtotal: Number(form.subtotal) || 0,
        vatAmount: Number(form.vatAmount) || 0,
        total: Number(form.total) || 0,
        depositAmount: Number(form.depositAmount) || 0,
        balanceDue: Number(form.balanceDue) || 0,
        paymentStatus: form.paymentStatus,
        ...(canEditCreatedAt && {
          createdAt: dateInputToIso(form.createdAt),
        }),
        dueDate: form.dueDate ? `${form.dueDate}T12:00:00.000Z` : null,
        items: items
          .filter((item) => item.description.trim())
          .map((item) => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unitPrice: parseDecimal(item.unitPrice),
            vatRate: parseDecimal(item.vatRate),
            total: lineTotal(item),
          })),
        discounts: discounts
          .filter((d) => d.description.trim() && d.value > 0)
          .map((d) => ({
            description: d.description.trim(),
            mode: d.mode,
            value: Number(d.value) || 0,
          })),
        notes: form.notes.trim() || null,
        disclaimer: form.disclaimer.trim() || INVOICE_COURTESY_DISCLAIMER,
        showWebsite: form.showWebsite,
        showQuoteRef: form.showQuoteRef,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["invoice", id] });
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      router.push(`/invoices/${id}`);
    },
    onError: () => setBanner("Errore durante il salvataggio."),
  });

  const confirmInvoice = useMutation({
    mutationFn: () => invoicesApi.confirm(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["invoice", id] });
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      setBanner("Documento confermato e numerato.");
      setTimeout(() => setBanner(""), 2500);
    },
    onError: () => setBanner("Errore durante la conferma del documento."),
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
    const totals = calculateInvoiceTotals(
      items,
      discounts.filter((d) => d.description.trim() && d.value > 0),
      Number(form.depositAmount) || 0
    );
    setForm((f) => ({
      ...f,
      subtotal: totals.subtotal.toFixed(2),
      vatAmount: totals.vatAmount.toFixed(2),
      total: totals.total.toFixed(2),
      balanceDue: totals.balanceDue.toFixed(2),
    }));
  }

  function updateDiscount(index: number, patch: Partial<InvoiceDiscount>) {
    setDiscounts((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
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
      <Header title="Modifica documento di cortesia" />
      <div className="p-6">
        <DetailBack href={`/invoices/${id}`} label="Torna al documento" />

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
            <p className="text-sm text-muted-foreground">
              {formatInvoiceDocumentNumber(data.number)} ·{" "}
              {data.client?.companyName || data.client?.contactName}
            </p>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-semibold">Importi</h2>
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
                    disabled={!canEditCreatedAt}
                    onChange={(e) => setForm((f) => ({ ...f, createdAt: e.target.value }))}
                  />
                  {!canEditCreatedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Non modificabile: esiste già un documento con numero progressivo
                      successivo.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold">Contenuto PDF</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scegli cosa mostrare in questo documento di cortesia.
                </p>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.showWebsite}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, showWebsite: e.target.checked }))
                      }
                    />
                    Mostra sito internet nell'intestazione
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.showQuoteRef}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, showQuoteRef: e.target.checked }))
                      }
                    />
                    Mostra riferimenti al preventivo
                  </label>
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
                          <select
                            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                            value={item.unit || ""}
                            onChange={(e) =>
                              updateItem(index, { unit: e.target.value || "" })
                            }
                          >
                            <option value="">—</option>
                            {SERVICE_UNIT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.value}
                              </option>
                            ))}
                            {item.unit &&
                              !SERVICE_UNIT_OPTIONS.some(
                                (option) => option.value === item.unit
                              ) && <option value={item.unit}>{item.unit}</option>}
                          </select>
                          <Input
                            inputMode="decimal"
                            value={String(item.unitPrice)}
                            onBlur={() =>
                              updateItem(index, {
                                unitPrice: formatDecimal(item.unitPrice),
                              })
                            }
                            onChange={(e) =>
                              updateItem(index, { unitPrice: e.target.value })
                            }
                          />
                          <Input
                            inputMode="decimal"
                            value={String(item.vatRate ?? "0,00")}
                            onBlur={() =>
                              updateItem(index, { vatRate: formatDecimal(item.vatRate) })
                            }
                            onChange={(e) =>
                              updateItem(index, { vatRate: e.target.value })
                            }
                          />
                          <Input value={formatDecimal(lineTotal(item))} readOnly />
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
                      {formatCurrency(calculatedTotals.subtotal)}
                      {calculatedTotals.totalDiscount > 0 && (
                        <>
                          {" "}
                          · Sconti -{formatCurrency(calculatedTotals.totalDiscount)}
                        </>
                      )}{" "}
                      · IVA {formatCurrency(calculatedTotals.vatAmount)} · Totale{" "}
                      {formatCurrency(calculatedTotals.total)}
                    </span>
                    <Button type="button" variant="outline" onClick={applyCalculatedTotals}>
                      Ricalcola importi dalle righe
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                  <div>
                    <h3 className="font-semibold">Sconti</h3>
                    <p className="text-xs text-muted-foreground">
                      Percentuale sull&apos;imponibile delle righe oppure importo fisso, con
                      descrizione.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDiscounts((rows) => [...rows, emptyDiscount()])}
                  >
                    <Plus className="h-4 w-4" />
                    Sconto
                  </Button>
                </div>
                <div className="space-y-3 p-4">
                  {discounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessuno sconto.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-[1fr_140px_120px_44px] gap-2 px-1 text-xs font-medium uppercase text-muted-foreground">
                        <span>Descrizione</span>
                        <span>Tipo</span>
                        <span>Valore</span>
                        <span />
                      </div>
                      {discounts.map((discount, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[1fr_140px_120px_44px] gap-2"
                        >
                          <Input
                            value={discount.description}
                            onChange={(e) =>
                              updateDiscount(index, { description: e.target.value })
                            }
                            placeholder="Es. Sconto fedeltà"
                          />
                          <select
                            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                            value={discount.mode}
                            onChange={(e) =>
                              updateDiscount(index, {
                                mode: e.target.value as InvoiceDiscount["mode"],
                              })
                            }
                          >
                            <option value="PERCENT">Percentuale %</option>
                            <option value="AMOUNT">Importo €</option>
                          </select>
                          <Input
                            type="number"
                            step={discount.mode === "PERCENT" ? "0.01" : "0.01"}
                            min="0"
                            value={discount.value || ""}
                            onChange={(e) =>
                              updateDiscount(index, {
                                value: Number(e.target.value) || 0,
                              })
                            }
                            placeholder={discount.mode === "PERCENT" ? "10" : "50,00"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDiscounts((rows) => rows.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {calculatedTotals.totalDiscount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Totale sconti: -{formatCurrency(calculatedTotals.totalDiscount)}
                          {discounts
                            .filter((d) => d.description.trim() && d.value > 0)
                            .map((d, i) => (
                              <span key={i} className="ml-2">
                                · {d.description}: -
                                {formatCurrency(
                                  discountDeduction(calculatedTotals.subtotal, d)
                                )}
                              </span>
                            ))}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-border p-4">
                <h3 className="font-semibold">{DOCUMENT_COPY.invoice.attachmentsTitle}</h3>
                <p className="mt-1 mb-4 text-xs text-muted-foreground">
                  {DOCUMENT_COPY.invoice.attachmentsHint}
                </p>
                <AttachmentPanel entityType="invoice" entityId={id} />
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
                  onClick={() =>
                    downloadInvoicePdf(
                      id,
                      `documento-${(data.number || "bozza").replace(/^FPR-/, "")}.pdf`
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Scarica PDF
                </Button>
                <Button
                  variant="outline"
                  disabled={data.status === "CONFIRMED" || confirmInvoice.isPending}
                  onClick={() => confirmInvoice.mutate()}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {data.status === "CONFIRMED"
                    ? "Documento confermato"
                    : confirmInvoice.isPending
                      ? "Conferma in corso..."
                      : "Conferma documento"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
