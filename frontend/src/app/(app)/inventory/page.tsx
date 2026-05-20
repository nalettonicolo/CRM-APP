"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Package, AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/header";
import {
  PageCreateBar,
  PageCreateLink,
} from "@/components/layout/page-create-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inventoryApi } from "@/lib/api";
import { SECTION_CREATE } from "@/lib/section-create";
import { cn, formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list(),
  });

  return (
    <>
      <Header title="Magazzino" />
      <div className="p-3 sm:p-4 md:p-6">
        <PageCreateBar>
          <PageCreateLink
            href="/inventory/products?new=1"
            label={SECTION_CREATE.product}
          />
          <PageCreateLink
            href="/inventory/services?new=1"
            label={SECTION_CREATE.service}
          />
        </PageCreateBar>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Giacenze
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left">Prodotto</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Sede</th>
                  <th className="px-4 py-3 text-right">Giacenza</th>
                  <th className="px-4 py-3 text-right">Min.</th>
                  <th className="px-4 py-3 text-right">Prezzo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Caricamento...
                    </td>
                  </tr>
                ) : (
                  data?.map((item) => {
                    const low =
                      Number(item.quantity) <= Number(item.minStock);
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-border",
                          low && "bg-amber-500/5"
                        )}
                      >
                        <td className="px-4 py-3 font-medium">
                          <span className="flex items-center gap-2">
                            {low && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                            {item.product.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {item.product.sku}
                        </td>
                        <td className="px-4 py-3">{item.warehouse.name}</td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono",
                            low && "text-amber-600 font-semibold"
                          )}
                        >
                          {Number(item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {Number(item.minStock)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(Number(item.product.price))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
