"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { inventoryApi } from "@/lib/api";
import { RENTAL_CATEGORY_PREFIX } from "@/lib/rental";

function groupKey(category?: string | null) {
  const c = category?.trim() || RENTAL_CATEGORY_PREFIX;
  if (c.toLowerCase().includes("audio")) return "Audio";
  if (c.toLowerCase().includes("luci")) return "Luci";
  return c;
}

export default function RentalPreparationPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["rentals", "preparation"],
    queryFn: inventoryApi.rentalPreparation,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const key = groupKey(item.category);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "it")
    );
  }, [items]);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <Header title="Preparazione noleggio" />
      <div className="p-4 sm:p-6 print:p-0">
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
          <div className="space-y-6">
            {grouped.map(([section, rows]) => (
              <section key={section}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground print:text-black">
                  {section}
                </h2>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 print:bg-gray-100">
                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                      <th className="px-3 py-2 text-left font-medium">Articolo</th>
                      <th className="px-3 py-2 text-right font-medium w-24">
                        Q.tà
                      </th>
                      <th className="px-3 py-2 text-left font-medium w-28 print:hidden">
                        Magazzino
                      </th>
                      <th className="w-16 px-3 py-2 text-center font-medium print:table-cell hidden">
                        ✓
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/70"
                      >
                        <td className="px-3 py-2 font-mono text-xs">{row.sku}</td>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {row.quantity}
                          {row.unit ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground print:text-gray-600">
                              {row.unit}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground print:hidden">
                          {row.warehouse || "—"}
                        </td>
                        <td className="hidden border border-gray-300 px-3 py-6 print:table-cell" />
                      </tr>
                    ))}
                  </tbody>
                </table>
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
