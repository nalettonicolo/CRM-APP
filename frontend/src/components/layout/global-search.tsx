"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { searchApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export function GlobalSearch({ className }: { className?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: results = [] } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchApi.query(q),
    enabled: q.trim().length >= 2,
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Ricerca globale..."
        className="w-64 pl-9"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-card py-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Nessun risultato
            </p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() => {
                      router.push(r.href);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="font-medium">{r.title}</span>
                    {r.subtitle && (
                      <span className="block text-xs text-muted-foreground">
                        {r.subtitle}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
