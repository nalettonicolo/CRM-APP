"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FileText, User, Pencil, Download, Mail, Receipt } from "lucide-react";
import { AttachmentPanel } from "@/components/files/attachment-panel";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { DetailBack, DetailSection } from "@/components/detail/detail-shell";
import { downloadQuotePdf, invoicesApi, quotesApi } from "@/lib/api";
import {
  quoteStatusLabels,
  paymentStatusLabels,
  clientStatusLabels,
} from "@/lib/labels";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SENT: "bg-blue-500/15 text-blue-700",
  ACCEPTED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
  EXPIRED: "bg-amber-500/15 text-amber-700",
  CANCELLED: "bg-gray-500/15 text-gray-600",
};

export default function QuoteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  const [pdfBusy, setPdfBusy] = useState(false);

  const fromQuote = useMutation({
    mutationFn: () => invoicesApi.fromQuote(id),
    onSuccess: (inv) => router.push(`/invoices/${inv.id}`),
  });

  const sendEmail = useMutation({
    mutationFn: () => quotesApi.sendEmail(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", id] }),
  });

  const { data: quote, isLoading, isError } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => quotesApi.get(id),
  });

  const clientName =
    quote?.client?.companyName ||
    quote?.client?.contactName ||
    "Cliente";

  return (
    <>
      <Header title="Dettaglio preventivo" />
      <div className="p-6">
        <DetailBack href="/quotes" label="Torna ai preventivi" />

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : isError || !quote ? (
          <p className="text-destructive">Preventivo non trovato.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">{quote.number}</p>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {quote.title || "Preventivo"}
                  </h1>
                  <Link
                    href={`/clients/${quote.clientId}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <User className="h-3.5 w-3.5" />
                    {clientName}
                  </Link>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Creato {formatDate(quote.createdAt)}
                    {quote.validUntil
                      ? ` · Valido fino al ${formatDate(quote.validUntil)}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pdfBusy}
                    onClick={async () => {
                      setPdfBusy(true);
                      try {
                        await downloadQuotePdf(
                          id,
                          `preventivo-${quote.number}.pdf`
                        );
                      } finally {
                        setPdfBusy(false);
                      }
                    }}
                  >
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sendEmail.isPending || !quote.client?.email}
                    onClick={() => sendEmail.mutate()}
                  >
                    <Mail className="h-4 w-4" />
                    {sendEmail.isPending ? "Invio..." : "Invia email"}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/quotes/${id}/edit`}>
                      <Pencil className="h-4 w-4" /> Modifica
                    </Link>
                  </Button>
                  {quote.status === "ACCEPTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={fromQuote.isPending}
                      onClick={() => fromQuote.mutate()}
                    >
                      <Receipt className="h-4 w-4" />
                      {fromQuote.isPending ? "…" : "Genera fattura"}
                    </Button>
                  )}
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium",
                    statusStyle[quote.status] || statusStyle.DRAFT
                  )}
                >
                  {quoteStatusLabels[quote.status] || quote.status}
                </span>
                {quote.paymentStatus && (
                  <span className="text-xs text-muted-foreground">
                    Pagamento:{" "}
                    {paymentStatusLabels[quote.paymentStatus] || quote.paymentStatus}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Imponibile", value: quote.subtotal },
                { label: "IVA", value: quote.vatAmount },
                { label: "Totale", value: quote.total, highlight: true },
                ...(Number(quote.depositAmount) > 0
                  ? [
                      { label: "Acconto", value: quote.depositAmount },
                      { label: "Saldo residuo", value: quote.balanceDue },
                    ]
                  : [{ label: "Saldo residuo", value: quote.balanceDue }]),
              ].map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    "rounded-xl border border-border bg-card p-4",
                    row.highlight && "border-primary/30 bg-primary/5"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      row.highlight && "text-primary"
                    )}
                  >
                    {formatCurrency(Number(row.value ?? 0))}
                  </p>
                </div>
              ))}
            </div>

            {(Number(quote.discountAmount) > 0 ||
              Number(quote.depositAmount) > 0 ||
              (quote.paymentTerms && quote.paymentTerms.length > 0)) && (
              <DetailSection title="Sconti e pagamenti">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  {Number(quote.discountPercent) > 0 && (
                    <>
                      <dt className="text-muted-foreground">Sconto %</dt>
                      <dd>{Number(quote.discountPercent)}%</dd>
                    </>
                  )}
                  {Number(quote.discountAmount) > 0 && (
                    <>
                      <dt className="text-muted-foreground">Sconto importo</dt>
                      <dd>{formatCurrency(Number(quote.discountAmount))}</dd>
                    </>
                  )}
                </dl>
                {quote.paymentTerms && quote.paymentTerms.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {quote.paymentTerms.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                      >
                        <span>
                          <span className="font-medium">{t.label}</span>
                          {t.note ? (
                            <span className="text-muted-foreground">
                              {" "}
                              — {t.note}
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular-nums font-medium">
                          {formatCurrency(Number(t.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  Number(quote.depositAmount) > 0 && (
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      {Number(quote.depositPercent) > 0 && (
                        <>
                          <dt className="text-muted-foreground">Acconto %</dt>
                          <dd>{Number(quote.depositPercent)}%</dd>
                        </>
                      )}
                      <dt className="text-muted-foreground">Acconto</dt>
                      <dd>{formatCurrency(Number(quote.depositAmount))}</dd>
                    </dl>
                  )
                )}
              </DetailSection>
            )}

            <DetailSection title="Voci preventivo">
              {quote.items && quote.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Descrizione</th>
                        <th className="pb-2 font-medium text-right">Q.tà</th>
                        <th className="pb-2 font-medium text-right">Prezzo</th>
                        <th className="pb-2 font-medium text-right">IVA %</th>
                        <th className="pb-2 font-medium text-right">Totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item) => (
                        <tr key={item.id} className="border-b border-border/60">
                          <td className="py-3 pr-4">
                            <span className="text-xs uppercase text-muted-foreground">
                              {item.type}
                            </span>
                            <p>{item.description}</p>
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            {Number(item.quantity)}
                          </td>
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
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna voce.</p>
              )}
            </DetailSection>

            {quote.notes && (
              <DetailSection title="Note per il cliente">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {quote.notes}
                </p>
              </DetailSection>
            )}

            <DetailSection title="Firma e accettazione">
              {quote.signedByClient && quote.clientSignature ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    Firmato e accettato
                    {quote.signedAt
                      ? ` il ${formatDate(quote.signedAt)}`
                      : ""}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={quote.clientSignature}
                    alt="Firma cliente"
                    className="max-h-24 rounded-lg border border-border bg-white p-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    La firma compare anche nel PDF del preventivo.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  In attesa di firma dal portale cliente (stato Inviato). Nel PDF
                  sono presenti le righe per firma e restituzione cartacea.
                </p>
              )}
            </DetailSection>

            <DetailSection title="Allegati">
              <AttachmentPanel entityType="quote" entityId={id} />
            </DetailSection>

            {quote.client && (
              <DetailSection title="Riepilogo cliente">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Ragione sociale: </span>
                    {quote.client.companyName || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email: </span>
                    {quote.client.email || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Telefono: </span>
                    {quote.client.phone || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Stato: </span>
                    {clientStatusLabels[quote.client.status] || quote.client.status}
                  </p>
                </div>
                <Link
                  href={`/clients/${quote.clientId}`}
                  className="mt-4 inline-block text-sm text-primary hover:underline"
                >
                  Apri scheda cliente completa →
                </Link>
              </DetailSection>
            )}
          </div>
        )}
      </div>
    </>
  );
}
