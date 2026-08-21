"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/components/ui/field-label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  supplierCatalogsApi,
  type SupplierCatalogSearchHit,
} from "@/lib/api";
import {
  CATALOG_MACROS,
  CATALOG_TECH_OPTIONS,
  linesForMacro,
  type CatalogTechFilter,
} from "@/lib/catalog-filters";
import { cn, formatCurrency } from "@/lib/utils";

const RECENT_KEY = "ie-listino-recent-skus";

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function pushRecent(sku: string) {
  if (!sku) return;
  const next = [sku, ...loadRecent().filter((s) => s !== sku)].slice(0, 12);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

type Props = {
  onAdd: (hit: SupplierCatalogSearchHit) => void;
};

/**
 * Selettore listino pensato per velocità:
 * digita → freccia/Enter o clic → aggiunto → cerca il prossimo.
 */
export function ListinoQuickPicker({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [macro, setMacro] = useState("");
  const [line, setLine] = useState("");
  const [tech, setTech] = useState<"" | CatalogTechFilter>("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRecent(loadRecent());
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 120);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [debounced, macro, line, tech]);

  const { data: linesData } = useQuery({
    queryKey: ["supplier-catalog-lines"],
    queryFn: () => supplierCatalogsApi.productLines(),
    enabled: open,
  });

  const lineOptions = useMemo(() => {
    const allowed = linesForMacro(macro);
    const all = linesData?.lines ?? [];
    if (!allowed) return all;
    return all.filter((l) => allowed.includes(l.line));
  }, [linesData, macro]);

  const showTech =
    macro === "domotica" ||
    ["Living Now", "Matix Go", "MyHome", "Smarther"].includes(line);

  const canSearch =
    debounced.length >= 2 ||
    (debounced.length === 1 && /^[a-z0-9]$/i.test(debounced)) ||
    Boolean(line || macro || tech);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["listino-quick-search", debounced, macro, line, tech],
    queryFn: () =>
      supplierCatalogsApi.searchItems(debounced, {
        macro: line ? undefined : macro || undefined,
        line: line || undefined,
        tech: showTech ? tech || undefined : undefined,
        limit: 40,
      }),
    enabled: open && canSearch,
    placeholderData: (prev) => prev,
  });

  const { data: recentHits = [] } = useQuery({
    queryKey: ["listino-recent", recent.join("|")],
    queryFn: async () => {
      const batches = await Promise.all(
        recent.slice(0, 8).map((sku) =>
          supplierCatalogsApi.searchItems(sku, { limit: 5 })
        )
      );
      const out: SupplierCatalogSearchHit[] = [];
      recent.slice(0, 8).forEach((sku, i) => {
        const found = batches[i] || [];
        const exact =
          found.find((h) => h.sku?.toUpperCase() === sku.toUpperCase()) ||
          found[0];
        if (exact && !out.some((x) => x.id === exact.id)) out.push(exact);
      });
      return out;
    },
    enabled: open && recent.length > 0 && query.trim().length === 0,
  });

  function addHit(hit: SupplierCatalogSearchHit) {
    onAdd(hit);
    if (hit.sku) {
      pushRecent(hit.sku);
      setRecent(loadRecent());
    }
    setJustAdded(hit.sku || hit.name);
    setQuery("");
    setDebounced("");
    setActiveIdx(0);
    window.setTimeout(() => setJustAdded(null), 1200);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function tryAddFromKeyboard() {
    if (!hits.length) return;
    const q = query.trim().toUpperCase();
    const exact = hits.find((h) => h.sku?.toUpperCase() === q);
    addHit(exact || hits[Math.min(activeIdx, hits.length - 1)]);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Aggiungi dal listino
        </Button>
        <p className="text-xs text-muted-foreground">
          Cerca per nome o codice · Invio per aggiungere
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="text-base">
              Listino fornitori — aggiungi voce
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Scrivi, usa ↑ ↓, premi Invio. Resta aperto per la voce successiva.
            </p>
          </DialogHeader>

          <div className="space-y-2 border-b border-border px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    tryAddFromKeyboard();
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="presa · deviatore · KW10C · JG4003C…"
                className="h-11 pl-9 pr-9 text-base"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtri
                {(macro || line || tech) && (
                  <span className="rounded bg-primary/20 px-1.5 text-[10px]">
                    on
                  </span>
                )}
              </Button>
              {macro && (
                <span className="text-[11px] text-muted-foreground">
                  {CATALOG_MACROS.find((m) => m.id === macro)?.label}
                  {line ? ` · ${line}` : ""}
                  {tech ? ` · ${tech}` : ""}
                </span>
              )}
              {justAdded && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Aggiunto {justAdded}
                </span>
              )}
            </div>

            {showFilters && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2">
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs",
                      !macro
                        ? "border-primary bg-primary/15"
                        : "border-border text-muted-foreground"
                    )}
                    onClick={() => {
                      setMacro("");
                      setLine("");
                      setTech("");
                    }}
                  >
                    Tutte
                  </button>
                  {CATALOG_MACROS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs",
                        macro === m.id
                          ? "border-primary bg-primary/15"
                          : "border-border text-muted-foreground"
                      )}
                      onClick={() => {
                        setMacro(m.id);
                        setLine("");
                        if (m.id !== "domotica") setTech("");
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    className={cn(appSelectClass, "h-9")}
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                  >
                    <option value="">Linea prodotto</option>
                    {lineOptions.map((l) => (
                      <option key={l.line} value={l.line}>
                        {l.line} ({l.count})
                      </option>
                    ))}
                  </select>
                  {showTech && (
                    <select
                      className={cn(appSelectClass, "h-9")}
                      value={tech}
                      onChange={(e) =>
                        setTech(e.target.value as "" | CatalogTechFilter)
                      }
                    >
                      <option value="">BUS / Zigbee / Trad.</option>
                      {CATALOG_TECH_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!canSearch && query.trim().length === 0 && recentHits.length > 0 && (
              <div className="border-b border-border px-3 py-2">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Usati di recente
                </p>
                <ul>
                  {recentHits.map((hit) => (
                    <ResultRow
                      key={`r-${hit.id}`}
                      hit={hit}
                      active={false}
                      onAdd={() => addHit(hit)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {!canSearch && query.trim().length > 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Digita almeno 2 caratteri…
              </p>
            )}

            {canSearch && isFetching && hits.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Ricerca…
              </p>
            )}

            {canSearch && !isFetching && hits.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nessun risultato per «{debounced}».
                {(macro || line || tech) && (
                  <span className="mt-1 block text-xs">
                    Prova a togliere i filtri: potrebbero nascondere il codice.
                  </span>
                )}
                <span className="mt-1 block text-xs">
                  Nel catalogo Bticino restano solo i codici Living Now.
                </span>
              </p>
            )}

            {hits.length > 0 && (
              <ul>
                {hits.map((hit, idx) => (
                  <ResultRow
                    key={hit.id}
                    hit={hit}
                    active={idx === activeIdx}
                    onAdd={() => addHit(hit)}
                    onHover={() => setActiveIdx(idx)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ seleziona · Invio aggiunge · Esc chiude</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Fatto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultRow({
  hit,
  active,
  onAdd,
  onHover,
}: {
  hit: SupplierCatalogSearchHit;
  active: boolean;
  onAdd: () => void;
  onHover?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onAdd}
        onMouseEnter={onHover}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          active ? "bg-primary/15" : "hover:bg-muted/50"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-sm font-semibold text-primary">
              {hit.sku || "—"}
            </span>
            {hit.productLine && (
              <span className="text-[11px] text-muted-foreground">
                {hit.productLine}
              </span>
            )}
            {hit.techFamily && hit.techFamily !== "TRADIZIONALE" && (
              <span className="text-[11px] text-sky-300">
                {hit.techFamily === "BUS" ? "BUS" : "Zigbee"}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-foreground">{hit.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(hit.customerPrice ?? hit.listPrice)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hit.sellPrice != null
              ? "prezzo cliente"
              : `listino · netto ${formatCurrency(hit.netPrice)}`}
          </p>
        </div>
      </button>
    </li>
  );
}
