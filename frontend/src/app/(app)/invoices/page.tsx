"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableRow } from "@/components/detail/detail-shell";
import { invoicesApi } from "@/lib/api";
import { paymentStatusLabels } from "@/lib/labels";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicesPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoicesApi.list(),
  });

  const rows = data?.data ?? [];

  return (
    <>
      <Header title="Fatture" />
      <div className="p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Bozze fattura generate da preventivi. Non valide ai fini fiscali.
        </p>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left">Numero</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Pagamento</th>
                  <th className="px-4 py-3 text-right">Totale</th>
                  <th className="px-4 py-3 text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Caricamento...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      Nessuna fattura. Genera da un preventivo accettato.
                    </td>
                  </tr>
                ) : (
                  rows.map((inv) => (
                    <ClickableRow
                      key={inv.id}
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                      <td className="px-4 py-3">
                        {inv.client?.companyName || inv.client?.contactName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {paymentStatusLabels[inv.paymentStatus] || inv.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatDate(inv.createdAt)}
                      </td>
                    </ClickableRow>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
