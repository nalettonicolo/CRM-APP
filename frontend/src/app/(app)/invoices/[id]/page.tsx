"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Mail, Pencil, Printer, Receipt, Trash2 } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { AttachmentPanel } from "@/components/files/attachment-panel";
import { DetailBack, DetailField, DetailSection } from "@/components/detail/detail-shell";
import { Button } from "@/components/ui/button";
import { downloadInvoicePdf, printInvoicePdf, invoicesApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { PaymentMethodLine } from "@/components/documents/payment-method-line";
import { formatInvoicePaymentLineSegments } from "@/lib/labels";
import {
  DOCUMENT_COPY,
  INVOICE_COURTESY_DISCLAIMER,
  formatInvoiceDocumentNumber,
} from "@/lib/document-copy";
import {
  discountDeduction,
  parseInvoiceDiscounts,
} from "@/lib/invoice-line-items";
import { cn, formatCurrency, formatDate, formatEventDateRange } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const id = useParams().id as string;
  const router = useRouter();
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [banner, setBanner] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoicesApi.get(id),
  });

  const displayItems =
    data?.items?.length ? data.items : data?.quote?.items ?? [];
  const discounts = parseInvoiceDiscounts(data?.discounts);
  const grossSubtotal = Number(data?.subtotal ?? 0);

  const sendEmail = useMutation({
    mutationFn: () => invoicesApi.sendEmail(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
    },
    onError: (e: Error) =>
      setBanner(e.message || "Invio email non riuscito."),
  });

  const confirmInvoice = useMutation({
    mutationFn: () => invoicesApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setBanner("Documento confermato e numerato.");
      setTimeout(() => setBanner(""), 3000);
    },
    onError: (e: Error) =>
      setBanner(e.message || "Errore durante la conferma del documento."),
  });

  const deleteInvoice = useMutation({
    mutationFn: () => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      router.push(routes.invoices);
    },
    onError: (e: Error) =>
      setBanner(e.message || "Errore durante l'eliminazione del documento."),
  });

  return (
    <>
      <WorkspaceHeader title={DOCUMENT_COPY.invoice.detailTitle} />
      <div className="p-6">
        <DetailBack href={routes.invoices} label={DOCUMENT_COPY.invoice.detailBack} />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !data ? (
          <p className="text-destructive">{DOCUMENT_COPY.invoice.notFound}</p>
        ) : (
          <div className="space-y-6">
            {banner && (
              <p
                className={cn(
                  "rounded-lg px-4 py-2 text-sm",
                  banner.includes("non riuscito") || banner.includes("fallito")
                    ? "border border-destructive/30 bg-destructive/10 text-destructive"
                    : "border border-primary/30 bg-primary/10 text-foreground"
                )}
              >
                {banner}
              </p>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Receipt className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">
                    {formatInvoiceDocumentNumber(data.number)}
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {data.status === "CONFIRMED"
                      ? DOCUMENT_COPY.invoice.detailTitle
                      : "Documento in bozza"}
                  </h1>
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
                      href={routes.quote(data.quoteId!)}
                      className="mt-1 block text-xs text-muted-foreground hover:text-primary"
                    >
                      {DOCUMENT_COPY.invoice.fromQuotePrefix} {data.quote.number}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
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
                  size="sm"
                  onClick={() => printInvoicePdf(id)}
                >
                  <Printer className="h-4 w-4" />
                  Stampa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sendEmail.isPending || !data.client?.email || data.status !== "CONFIRMED"}
                  onClick={() => {
                    if (
                      data.sentAt &&
                      !window.confirm(DOCUMENT_COPY.invoice.resendConfirm)
                    ) {
                      return;
                    }
                    const isResend = Boolean(data.sentAt);
                    sendEmail.mutate(undefined, {
                      onSuccess: () => {
                        setBanner(
                          isResend
                            ? DOCUMENT_COPY.invoice.emailResentSuccess
                            : DOCUMENT_COPY.invoice.emailSentSuccess
                        );
                        setTimeout(() => setBanner(""), 4000);
                      },
                    });
                  }}
                >
                  <Mail className="h-4 w-4" />
                  {sendEmail.isPending
                    ? DOCUMENT_COPY.invoice.sendEmailPending
                    : data.sentAt
                      ? DOCUMENT_COPY.invoice.resendEmail
                      : DOCUMENT_COPY.invoice.sendEmail}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={routes.invoiceEdit(id)}>
                    <Pencil className="h-4 w-4" /> Modifica
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.status === "CONFIRMED" || confirmInvoice.isPending}
                  onClick={() => confirmInvoice.mutate()}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {data.status === "CONFIRMED"
                    ? "Confermato"
                    : confirmInvoice.isPending
                      ? "Conferma..."
                      : "Conferma documento"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:text-destructive"
                  disabled={deleteInvoice.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Eliminare il documento ${formatInvoiceDocumentNumber(data.number)}?`
                      )
                    ) {
                      return;
                    }
                    setBanner("");
                    deleteInvoice.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteInvoice.isPending ? "Elimino..." : "Elimina"}
                </Button>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    data.sentAt
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {data.status !== "CONFIRMED"
                    ? "Bozza"
                    : data.sentAt
                    ? `${DOCUMENT_COPY.invoice.sentPrefix} ${formatDate(data.sentAt)}`
                    : DOCUMENT_COPY.invoice.notSent}
                </span>
              </div>
            </div>

            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              {data.disclaimer || INVOICE_COURTESY_DISCLAIMER}
            </p>

            <DetailSection title="Evento">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label="Luogo"
                  value={
                    data.eventLocation?.trim() ||
                    data.quote?.eventLocation?.trim() ||
                    "—"
                  }
                />
                <DetailField
                  label="Date servizio"
                  value={
                    formatEventDateRange(
                      data.eventAt ?? data.quote?.eventAt,
                      data.eventEndAt ?? data.quote?.eventEndAt
                    ) || "—"
                  }
                />
              </div>
            </DetailSection>

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
                  value={
                    <PaymentMethodLine
                      segments={formatInvoicePaymentLineSegments(data)}
                    />
                  }
                />
                <DetailField
                  label="Scadenza"
                  value={data.dueDate ? formatDate(data.dueDate) : "—"}
                />
                <DetailField
                  label="Data emissione"
                  value={formatDate(data.createdAt)}
                />
                {Number(data.depositAmount) > 0 && (
                  <DetailField
                    label="Acconto"
                    value={formatCurrency(Number(data.depositAmount))}
                  />
                )}
              </div>
            </DetailSection>

            {discounts.length > 0 && (
              <DetailSection title="Sconti">
                <ul className="space-y-2 text-sm">
                  {discounts.map((discount, index) => (
                    <li
                      key={index}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                    >
                      <span>
                        <span className="font-medium">{discount.description}</span>
                        {discount.mode === "PERCENT" ? (
                          <span className="text-muted-foreground"> · {discount.value}%</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums font-medium text-destructive">
                        -{formatCurrency(discountDeduction(grossSubtotal, discount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            <DetailSection title="Voci documento">
              {displayItems.length > 0 ? (
                <>
                  <div className="space-y-3 md:hidden">
                    {displayItems.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-border bg-muted/20 p-3 text-sm"
                      >
                        <p className="font-medium">{item.description}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                          <dt className="text-muted-foreground">Q.tà</dt>
                          <dd className="text-right tabular-nums">{Number(item.quantity)}</dd>
                          {item.unit ? (
                            <>
                              <dt className="text-muted-foreground">Unità</dt>
                              <dd className="text-right">{item.unit}</dd>
                            </>
                          ) : null}
                          <dt className="text-muted-foreground">Prezzo</dt>
                          <dd className="text-right tabular-nums">
                            {formatCurrency(Number(item.unitPrice))}
                          </dd>
                          <dt className="text-muted-foreground">IVA</dt>
                          <dd className="text-right tabular-nums">{Number(item.vatRate)}%</dd>
                          <dt className="text-muted-foreground">Totale</dt>
                          <dd className="text-right font-medium tabular-nums">
                            {formatCurrency(Number(item.total))}
                          </dd>
                        </dl>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Descrizione</th>
                          <th className="pb-2 font-medium text-right">Q.tà</th>
                          <th className="pb-2 font-medium text-right">Unità</th>
                          <th className="pb-2 font-medium text-right">Prezzo</th>
                          <th className="pb-2 font-medium text-right">IVA %</th>
                          <th className="pb-2 font-medium text-right">Totale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayItems.map((item, index) => (
                          <tr key={index} className="border-b border-border/60">
                            <td className="py-3 pr-4">{item.description}</td>
                            <td className="py-3 text-right tabular-nums">
                              {Number(item.quantity)}
                            </td>
                            <td className="py-3 text-right">{item.unit || "—"}</td>
                            <td className="py-3 text-right tabular-nums">
                              {formatCurrency(Number(item.unitPrice))}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {Number(item.vatRate)}%
                            </td>
                            <td className="py-3 text-right font-medium tabular-nums">
                              {formatCurrency(Number(item.total))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna voce.</p>
              )}
            </DetailSection>

            {data.notes && (
              <DetailSection title="Note">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {data.notes}
                </p>
              </DetailSection>
            )}

            <DetailSection title={DOCUMENT_COPY.invoice.attachmentsTitle}>
              <p className="mb-4 text-sm text-muted-foreground">
                {DOCUMENT_COPY.invoice.attachmentsHint}
              </p>
              <AttachmentPanel entityType="invoice" entityId={id} />
            </DetailSection>
          </div>
        )}
      </div>
    </>
  );
}
