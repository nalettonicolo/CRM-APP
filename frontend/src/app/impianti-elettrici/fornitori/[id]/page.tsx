"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { IeHeader } from "@/components/ie/ie-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicAssetUrl } from "@/lib/branding";
import { supplierCatalogsApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { formatCurrency } from "@/lib/utils";

export default function IeSupplierCatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const routes = useWorkspaceRoutes();
  const { data: cat, isLoading } = useQuery({
    queryKey: ["supplier-catalog", id],
    queryFn: () => supplierCatalogsApi.get(id),
  });

  const disc = Number(cat?.defaultDiscountPercent) || 0;

  return (
    <>
      <IeHeader title="Catalogo fornitore" />
      <div className="p-4 sm:p-6 space-y-4">
        <Link
          href={routes.supplierCatalogs}
          className="text-sm text-sky-400 hover:underline"
        >
          ← Fornitori / listini
        </Link>
        {isLoading || !cat ? (
          <p className="text-slate-400">Caricamento…</p>
        ) : (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-slate-100">{cat.title}</CardTitle>
              <p className="text-sm text-slate-400">
                {cat.supplierName}
                {disc > 0 ? ` · sconto listino ${disc}%` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              {cat.filePath && (
                <a
                  href={publicAssetUrl(cat.filePath)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  Apri PDF / file allegato
                </a>
              )}
              {cat.items.length > 0 && (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="py-2">SKU</th>
                      <th>Descrizione</th>
                      <th className="text-right">Listino</th>
                      <th className="text-right">Sconto</th>
                      <th className="text-right">Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, i) => {
                      const list = Number(item.listPrice) || 0;
                      const d = Number(item.discountPercent) || disc;
                      const net = list * (1 - d / 100);
                      return (
                        <tr
                          key={item.id || i}
                          className="border-b border-slate-800/60"
                        >
                          <td className="py-2 font-mono text-xs">
                            {item.sku || "—"}
                          </td>
                          <td>{item.name}</td>
                          <td className="text-right">{formatCurrency(list)}</td>
                          <td className="text-right">{d}%</td>
                          <td className="text-right text-sky-300">
                            {formatCurrency(net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
