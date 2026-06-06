"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { Header } from "@/components/layout/header";
import { DataCard } from "@/components/ui/data-card";
import { ListCard } from "@/components/ui/list-card";
import { InvoiceCreateDialog } from "@/components/invoices/invoice-create-dialog";
import { ClickableRow } from "@/components/detail/detail-shell";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { invoicesApi } from "@/lib/api";
import { DOCUMENT_COPY, formatInvoiceDocumentNumber } from "@/lib/document-copy";
import { formatInvoicePaymentDisplay } from "@/lib/labels";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const deleteInvoice = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoicesApi.list(),
  });

  const rows = data?.data ?? [];

  return (
    <>
      <Header title={DOCUMENT_COPY.invoice.pageTitle} />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {DOCUMENT_COPY.invoice.pageIntro}
          </p>
          <InvoiceCreateDialog />
        </div>
        <div className="space-y-2 md:hidden">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Caricamento...
            </p>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {DOCUMENT_COPY.invoice.listEmpty}
            </div>
          ) : (
            rows.map((inv) => (
              <ListCard
                key={inv.id}
                onClick={() => router.push(`/invoices/${inv.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatInvoiceDocumentNumber(inv.number)}
                    </p>
                    <p className="mt-1 font-semibold leading-snug">
                      {inv.client?.companyName || inv.client?.contactName || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {formatInvoicePaymentDisplay(inv)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(inv.total))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(inv.createdAt)}
                  </span>
                </div>
              </ListCard>
            ))
          )}
        </div>

        <DataCard className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left">Numero</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Pagamento</th>
                  <th className="px-4 py-3 text-right">Totale</th>
                  <th className="px-4 py-3 text-right">Data</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Caricamento...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      {DOCUMENT_COPY.invoice.listEmpty}
                    </td>
                  </tr>
                ) : (
                  rows.map((inv) => (
                    <ClickableRow
                      key={inv.id}
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatInvoiceDocumentNumber(inv.number)}
                      </td>
                      <td className="px-4 py-3">
                        {inv.client?.companyName || inv.client?.contactName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {formatInvoicePaymentDisplay(inv)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteEntityButton
                          size="icon"
                          pending={deleteInvoice.isPending}
                          confirmMessage={`Eliminare il documento ${formatInvoiceDocumentNumber(inv.number)}?`}
                          onConfirm={() => deleteInvoice.mutate(inv.id)}
                        />
                      </td>
                    </ClickableRow>
                  ))
                )}
              </tbody>
            </table>
        </DataCard>
      </div>
    </>
  );
}
