"use client";

import { useQuery } from "@tanstack/react-query";
import { Package, AlertTriangle } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import {
  PageCreateBar,
  PageCreateLink,
} from "@/components/layout/page-create-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace, useWorkspaceRoutes } from "@/contexts/workspace-context";
import { inventoryApi } from "@/lib/api";
import { SECTION_CREATE } from "@/lib/section-create";
import { cn, formatCurrency } from "@/lib/utils";

export function InventoryListView() {
  const workspace = useWorkspace();
  const routes = useWorkspaceRoutes();
  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list(),
  });

  return (
    <>
      <WorkspaceHeader title="Magazzino" />
      <div className="p-3 sm:p-4 md:p-6">
        <PageCreateBar>
          <PageCreateLink
            href={`${routes.products}?new=1`}
            label={SECTION_CREATE.product}
          />
          {workspace === "crm" && (
            <PageCreateLink
              href="/inventory/rentals?new=1"
              label={SECTION_CREATE.rental}
            />
          )}
          <PageCreateLink
            href={`${routes.services}?new=1`}
            label={SECTION_CREATE.service}
          />
          <PageCreateLink href={routes.print} label="Documenti e stampa" />
        </PageCreateBar>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Giacenze
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="app-table-wrap">
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
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
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
                              low && "font-semibold text-amber-600"
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
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
