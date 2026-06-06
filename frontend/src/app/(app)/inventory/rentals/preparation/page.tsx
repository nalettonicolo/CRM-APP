"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { inventoryApi } from "@/lib/api";
import { groupRentalCatalog, parseRentalName } from "@/lib/rental-catalog";
import { cn } from "@/lib/utils";

export default function RentalPreparationPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["rentals", "preparation"],
    queryFn: inventoryApi.rentalPreparation,
  });

  const grouped = useMemo(() => groupRentalCatalog(items), [items]);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <Header title="Preparazione noleggio" />
      <div className="p-3 sm:p-4 md:p-6 print:p-0">
        <div className="mb-4 flex flex-wrap gap-3 text-sm print:hidden">
          <Link href="/inventory/rentals" className="text-primary hover:underline">
            ← Catalogo noleggio
          </Link>
          <Link href="/inventory/print" className="text-primary hover:underline">
            Area stampa
          </Link>
        </div>

        <PrintToolbar title="Lista senza prezzi — solo quantità a magazzino per preparare il materiale." />

        <div className="hidden print:block print:mb-4">
          <h1 className="text-lg font-bold">Lista preparazione noleggio</h1>
          <p className="text-sm text-gray-600">
            {new Date().toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {items.length} articoli · {totalQty} pezzi totali
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">
            Nessun articolo a noleggio nel catalogo.
          </p>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.departmentId}>
                <h2
                  className={cn(
                    "mb-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold print:rounded-none print:bg-transparent print:px-0 print:text-base print:text-black",
                    group.badgeClass
                  )}
                >
                  {group.departmentLabel}
                </h2>
                {group.families.map(({ family, items: familyItems }) => (
                  <div key={family} className="mb-4">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground print:text-black">
                      {family}
                    </h3>
                    <table className="w-full table-fixed border-collapse text-sm">
                      <colgroup>
                        <col className="w-[7.5rem]" />
                        <col />
                        <col className="w-24" />
                        <col className="w-28" />
                        <col className="w-16" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-border bg-muted/40 print:bg-gray-100">
                          <th className="px-3 py-2 text-left font-medium">SKU</th>
                          <th className="px-3 py-2 text-left font-medium">
                            Articolo
                          </th>
                          <th className="w-24 px-3 py-2 text-right font-medium">
                            Q.tà
                          </th>
                          <th className="w-28 px-3 py-2 text-left font-medium print:hidden">
                            Magazzino
                          </th>
                          <th className="hidden w-16 px-3 py-2 text-center font-medium print:table-cell">
                            ✓
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {familyItems.map((row) => {
                          const prep = items.find((i) => i.id === row.id);
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-border/70"
                            >
                              <td className="px-3 py-2">
                                <span className="inline-block min-w-[5.5rem] font-mono text-xs tabular-nums tracking-tight">
                                  {row.sku}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {parseRentalName(row.name).model || row.name}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                {prep?.quantity ?? 0}
                                {prep?.unit ? (
                                  <span className="ml-1 text-xs font-normal text-muted-foreground print:text-gray-600">
                                    {prep.unit}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground print:hidden">
                                {prep?.warehouse || "—"}
                              </td>
                              <td className="hidden border border-gray-300 px-3 py-6 print:table-cell" />
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          aside,
          header,
          nav {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
