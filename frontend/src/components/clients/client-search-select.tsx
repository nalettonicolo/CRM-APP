"use client";

import { useEffect, useId, useRef, useState, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus, Search } from "lucide-react";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/contexts/workspace-context";
import { clientsApi, type Client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

function clientLabel(client: Client) {
  return (
    client.companyName ||
    client.contactName ||
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    client.email ||
    client.id
  );
}

export function ClientSearchSelect({
  value,
  onChange,
  placeholder = "Cerca o seleziona cliente…",
  className,
  disabled = false,
  required = false,
}: {
  value: string;
  onChange: (clientId: string, client?: Client) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const workspace = useWorkspace();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.clientsPicker(workspace, deferredQuery),
    queryFn: () => {
      const params: Record<string, string> = { limit: "30" };
      if (deferredQuery.trim()) params.search = deferredQuery.trim();
      return clientsApi.list(params);
    },
    enabled: open && !disabled,
  });

  const clients = data?.data ?? [];
  const trimmed = query.trim();
  const searching = isFetching || query !== deferredQuery;

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    if (selectedLabel) return;
    clientsApi
      .get(value)
      .then((c) => {
        setSelectedLabel(clientLabel(c));
        setQuery(clientLabel(c));
      })
      .catch(() => undefined);
  }, [value, selectedLabel]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickClient(client: Client) {
    const label = clientLabel(client);
    setSelectedLabel(label);
    setQuery(label);
    onChange(client.id, client);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* native required validation without showing a second control */}
      <input
        tabIndex={-1}
        className="sr-only"
        value={value}
        required={required}
        onChange={() => undefined}
        aria-hidden
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          className="pl-9 pr-9"
          value={query}
          disabled={disabled}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            if (value && next !== selectedLabel) {
              setSelectedLabel("");
              onChange("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown" && !disabled) setOpen(true);
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <li role="option" className="sticky top-0 z-10 border-b border-border bg-popover">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Nuovo cliente
              {trimmed ? (
                <span className="truncate font-normal text-muted-foreground">
                  “{trimmed}”
                </span>
              ) : null}
            </button>
          </li>
          {searching && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Ricerca…
            </li>
          )}
          {!searching && clients.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nessun cliente trovato
            </li>
          )}
          {!searching &&
            clients.map((c) => (
              <li key={c.id} role="option">
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted",
                    value === c.id && "bg-muted"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickClient(c)}
                >
                  <span className="font-medium">{clientLabel(c)}</span>
                  {(c.email || c.city) && (
                    <span className="text-xs text-muted-foreground">
                      {[c.email, c.city].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}

      <ClientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaults={{ companyName: trimmed, status: "ACTIVE" }}
        onSaved={(saved) => {
          pickClient(saved);
        }}
      />
    </div>
  );
}
