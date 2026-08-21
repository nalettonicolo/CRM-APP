"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supplierCatalogsApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { formatCurrency } from "@/lib/utils";

export default function IeAntifurtiCatalogPage() {
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("Tutte");
  const [seedTried, setSeedTried] = useState(false);

  const ensureMut = useMutation({
    mutationFn: () => supplierCatalogsApi.ensureAjax(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalogs", "SECURITY"] });
    },
  });

  const {
    data: catalogs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["supplier-catalogs", "SECURITY"],
    queryFn: () => supplierCatalogsApi.list({ category: "SECURITY" }),
  });

  useEffect(() => {
    if (seedTried || isLoading || isError) return;
    if (catalogs.length > 0) {
      setSeedTried(true);
      return;
    }
    setSeedTried(true);
    ensureMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogs, isLoading, isError, seedTried]);

  const ajax = catalogs[0];

  const { data: linesData } = useQuery({
    queryKey: ["supplier-catalog-lines", ajax?.id],
    queryFn: () => supplierCatalogsApi.productLines(ajax!.id),
    enabled: Boolean(ajax?.id),
  });

  const { data: detail, isFetching: loadingItems } = useQuery({
    queryKey: [
      "supplier-catalog",
      ajax?.id,
      line,
      query.trim(),
    ],
    queryFn: () =>
      supplierCatalogsApi.get(ajax!.id, {
        line: line === "Tutte" ? undefined : line,
        q: query.trim() || undefined,
        limit: 300,
      }),
    enabled: Boolean(ajax?.id),
  });

  const items = detail?.items ?? [];
  const lines = useMemo(() => linesData?.lines ?? [], [linesData]);
  const itemCount = detail?._count?.items ?? ajax?._count?.items ?? 0;

  return (
    <>
      <IeHeader title="Catalogo antifurti" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="rounded-xl border border-sky-800/40 bg-sky-950/40 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sky-50">Antifurti e sicurezza</p>
              <p className="mt-1 text-sm text-slate-400">
                Catalogo Ajax Systems con prezzi consigliati IT (IVA esclusa).
                Puoi aggiornare listino e prezzo cliente nel dettaglio; in
                preventivo cerca i codici come per Bticino.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={ensureMut.isPending}
              onClick={() => ensureMut.mutate()}
            >
              {ensureMut.isPending
                ? "Import Ajax…"
                : ajax
                  ? "Reimporta Ajax"
                  : "Importa catalogo Ajax"}
            </Button>
          </div>
          {ensureMut.isSuccess && (
            <p className="mt-3 text-xs text-emerald-400">
              {ensureMut.data.message} ({ensureMut.data.imported} voci)
            </p>
          )}
          {ensureMut.isError && (
            <p className="mt-3 text-xs text-red-300">
              {ensureMut.error instanceof Error
                ? ensureMut.error.message
                : "Import fallito"}
            </p>
          )}
        </div>

        {isLoading && (
          <p className="text-sm text-slate-400">Caricamento cataloghi…</p>
        )}
        {isError && (
          <p className="text-sm text-red-300">
            {error instanceof Error ? error.message : "Errore caricamento"}
          </p>
        )}

        {ajax && (
          <Card className="border-slate-800 bg-slate-950/60">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-slate-100">
                    {ajax.supplierName} — {ajax.title}
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {itemCount} voci · listino consigliato (modificabile)
                  </p>
                </div>
                <Link
                  href={routes.supplierCatalog(ajax.id)}
                  className="text-sm text-sky-400 hover:underline"
                >
                  Apri dettaglio / prezzi
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLine("Tutte")}
                  className={
                    line === "Tutte"
                      ? "rounded-md bg-sky-700/80 px-2.5 py-1 text-xs text-white"
                      : "rounded-md bg-slate-900 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
                  }
                >
                  Tutte
                </button>
                {lines.map((l) => (
                  <button
                    key={l.line}
                    type="button"
                    onClick={() => setLine(l.line)}
                    className={
                      line === l.line
                        ? "rounded-md bg-sky-700/80 px-2.5 py-1 text-xs text-white"
                        : "rounded-md bg-slate-900 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
                    }
                  >
                    {l.line} ({l.count})
                  </button>
                ))}
              </div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca codice o descrizione Ajax…"
                className="max-w-md border-slate-700 bg-slate-950"
              />
              {loadingItems && items.length === 0 ? (
                <p className="text-sm text-slate-500">Caricamento voci…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-500">Nessuna voce trovata.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-2">SKU</th>
                        <th>Linea</th>
                        <th>Descrizione</th>
                        <th className="text-right">Listino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-800/60"
                        >
                          <td className="py-2 font-mono text-xs text-sky-300">
                            {item.sku || "—"}
                          </td>
                          <td className="text-xs text-slate-400">
                            {item.productLine || "—"}
                          </td>
                          <td className="text-slate-200">{item.name}</td>
                          <td className="text-right tabular-nums text-slate-100">
                            {Number(item.listPrice) > 0
                              ? formatCurrency(Number(item.listPrice))
                              : "da quotare"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isLoading && !ajax && !ensureMut.isPending && (
          <p className="text-sm text-slate-400">
            Nessun catalogo antifurti. Premi «Importa catalogo Ajax».
          </p>
        )}
      </div>
    </>
  );
}
