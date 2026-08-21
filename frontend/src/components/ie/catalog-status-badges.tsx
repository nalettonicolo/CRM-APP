"use client";

import { Check, ImageIcon, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupplierCatalogStatus } from "@/lib/api";

function Bollino({
  ok,
  label,
  detail,
  tone = "sky",
}: {
  ok: boolean;
  label: string;
  detail: string;
  tone?: "sky" | "emerald" | "amber";
}) {
  const okTone =
    tone === "emerald"
      ? "border-emerald-600/60 bg-emerald-950/50 text-emerald-200"
      : tone === "amber"
        ? "border-amber-600/60 bg-amber-950/40 text-amber-100"
        : "border-sky-600/60 bg-sky-950/50 text-sky-100";

  return (
    <div
      className={cn(
        "flex min-w-[140px] flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5",
        ok
          ? okTone
          : "border-slate-700/80 bg-slate-950/40 text-slate-500"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          ok ? "bg-black/20" : "bg-slate-800/80"
        )}
      >
        {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="truncate text-[11px] opacity-80">{detail}</p>
      </div>
    </div>
  );
}

/** Tre bollini: Prezzi ok / Foto ok / Uniti X */
export function CatalogStatusBadges({
  status,
  className,
}: {
  status?: SupplierCatalogStatus | null;
  className?: string;
}) {
  const s = status ?? {
    hasPrices: false,
    hasPhotos: false,
    mergedCount: 0,
    itemCount: 0,
  };

  return (
    <div className={cn("grid gap-2 sm:grid-cols-3", className)}>
      <Bollino
        ok={s.hasPrices}
        tone="sky"
        label={s.hasPrices ? "Prezzi ok" : "Prezzi mancanti"}
        detail={
          s.hasPrices
            ? `${s.itemCount.toLocaleString("it-IT")} voci nel preventivatore`
            : "Carica il listino prezzi e unisci"
        }
      />
      <Bollino
        ok={s.hasPhotos}
        tone="emerald"
        label={s.hasPhotos ? "Foto ok" : "Foto mancanti"}
        detail={
          s.hasPhotos
            ? "Catalogo immagini allegato"
            : "Carica il PDF catalogo (Living Now)"
        }
      />
      <Bollino
        ok={s.mergedCount > 0}
        tone="amber"
        label={
          s.mergedCount > 0
            ? `Uniti ${s.mergedCount.toLocaleString("it-IT")}`
            : "Non uniti"
        }
        detail={
          s.mergedCount > 0
            ? "Stesso codice in listino + Excel/catalogo"
            : "Serve Excel computo + pulsante Unisci"
        }
      />
    </div>
  );
}

export function CatalogStatusIcons({
  status,
}: {
  status?: SupplierCatalogStatus | null;
}) {
  const s = status;
  if (!s) return null;
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
          s.hasPrices
            ? "border-sky-700/50 text-sky-300"
            : "border-slate-700 text-slate-500"
        )}
      >
        {s.hasPrices ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
        Prezzi
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
          s.hasPhotos
            ? "border-emerald-700/50 text-emerald-300"
            : "border-slate-700 text-slate-500"
        )}
      >
        {s.hasPhotos ? (
          <ImageIcon className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )}
        Foto
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
          s.mergedCount > 0
            ? "border-amber-700/50 text-amber-200"
            : "border-slate-700 text-slate-500"
        )}
      >
        <Link2 className="h-3 w-3" />
        {s.mergedCount > 0 ? `Uniti ${s.mergedCount}` : "Non uniti"}
      </span>
    </div>
  );
}
