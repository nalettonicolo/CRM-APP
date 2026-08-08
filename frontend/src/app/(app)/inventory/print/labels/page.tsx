"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { Button } from "@/components/ui/button";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { inventoryApi } from "@/lib/api";
import { skuPrefixForCategory } from "@/lib/rental";
import { cn } from "@/lib/utils";

type Source = "rentals" | "products";

export default function LabelsPrintPage() {
  const routes = useWorkspaceRoutes();
  const [source, setSource] = useState<Source>("rentals");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rentals = [] } = useQuery({
    queryKey: ["rentals"],
    queryFn: inventoryApi.rentals,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", "sale"],
    queryFn: () => inventoryApi.products({ excludeRental: true }),
  });

  const list = source === "rentals" ? rentals : products;

  const allIds = useMemo(() => list.map((p) => p.id), [list]);
  const selectedItems = list.filter((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }

  function clearAll() {
    setSelected(new Set());
  }

  return (
    <>
      <WorkspaceHeader title="Etichette SKU" />
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-3 text-sm print:hidden">
          <Link href={routes.print} className="text-primary hover:underline">
            ← Area stampa
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button
            type="button"
            size="sm"
            variant={source === "rentals" ? "default" : "outline"}
            onClick={() => {
              setSource("rentals");
              setSelected(new Set());
            }}
          >
            Noleggio
          </Button>
          <Button
            type="button"
            size="sm"
            variant={source === "products" ? "default" : "outline"}
            onClick={() => {
              setSource("products");
              setSelected(new Set());
            }}
          >
            Prodotti vendita
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={selectAll}>
            Seleziona tutti
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
            Deseleziona
          </Button>
        </div>

        <PrintToolbar
          title={
            selectedItems.length
              ? `${selectedItems.length} etichette pronte — usa Stampa (o Ctrl+P).`
              : "Seleziona gli articoli da stampare."
          }
        />

        {selectedItems.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3 print:gap-2">
            {selectedItems.map((p) => (
              <div
                key={p.id}
                className="flex min-h-[88px] flex-col justify-between rounded-lg border-2 border-dashed border-border p-3 print:min-h-[72px] print:break-inside-avoid print:border-gray-400 print:p-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-gray-500">
                  {skuPrefixForCategory(p.category)}
                </p>
                <p className="font-mono text-lg font-bold leading-tight print:text-base">
                  {p.sku}
                </p>
                <p className="line-clamp-2 text-xs font-medium leading-snug print:text-[11px]">
                  {p.name}
                </p>
                {p.category && (
                  <p className="text-[10px] text-muted-foreground print:text-gray-600">
                    {p.category}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <ul className="divide-y divide-border rounded-xl border border-border print:hidden">
          {list.map((p) => (
            <li key={p.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/30",
                  selected.has(p.id) && "bg-primary/5"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">
                  {p.sku}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {p.category || "—"}
                </span>
              </label>
            </li>
          ))}
        </ul>
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
          }
        }
      `}</style>
    </>
  );
}
