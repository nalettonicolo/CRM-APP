"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  paymentTermTemplatesApi,
  type PaymentTermDraft,
  type PaymentTermTemplate,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export type { PaymentTermDraft };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function resolveAmounts(total: number, terms: PaymentTermDraft[]) {
  const nonBalance = terms.filter((t) => !t.isBalance);
  const balanceRows = terms.filter((t) => t.isBalance);
  let allocated = 0;
  const rows: Array<PaymentTermDraft & { computed: number }> = [];

  for (const t of nonBalance) {
    let amt = 0;
    if (t.amount != null && t.amount > 0) amt = t.amount;
    else if (t.percent != null && t.percent > 0) amt = total * (t.percent / 100);
    amt = round2(amt);
    allocated += amt;
    rows.push({ ...t, computed: amt });
  }
  const remainder = round2(Math.max(0, total - allocated));
  for (const t of balanceRows) {
    rows.push({ ...t, computed: remainder });
  }
  return { rows, deposit: round2(total - remainder), balance: remainder };
}

const emptyRow = (): PaymentTermDraft => ({
  label: "",
  note: "",
  percent: undefined,
  amount: undefined,
  isBalance: false,
});

function templateToDraft(t: PaymentTermTemplate): PaymentTermDraft[] {
  return t.items.map((i) => ({
    label: i.label,
    note: i.note || undefined,
    percent: i.percent != null ? Number(i.percent) : undefined,
    amount: i.amount != null ? Number(i.amount) : undefined,
    isBalance: i.isBalance,
  }));
}

export function PaymentScheduleEditor({
  terms,
  onChange,
  grandTotal,
}: {
  terms: PaymentTermDraft[];
  onChange: (terms: PaymentTermDraft[]) => void;
  grandTotal: number;
}) {
  const { data: templates = [] } = useQuery({
    queryKey: ["payment-term-templates"],
    queryFn: paymentTermTemplatesApi.list,
  });

  const { rows, deposit, balance } = useMemo(
    () => resolveAmounts(grandTotal, terms),
    [grandTotal, terms]
  );

  function updateRow(index: number, patch: Partial<PaymentTermDraft>) {
    onChange(terms.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...terms, emptyRow()]);
  }

  function removeRow(index: number) {
    onChange(terms.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Piano di pagamento</h3>
          <p className="text-xs text-muted-foreground">
            Più acconti con testo personalizzato.{" "}
            <Link
              href="/settings/payment-terms"
              className="text-primary hover:underline"
            >
              Gestisci modelli
            </Link>
          </p>
        </div>
        {templates.length > 0 && (
          <select
            className="flex h-9 max-w-xs rounded-lg border border-border bg-background px-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              const tpl = templates.find((t) => t.id === id);
              if (tpl) onChange(templateToDraft(tpl));
              e.target.value = "";
            }}
          >
            <option value="">Carica modello…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isDefault ? " (predefinito)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {terms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna rata definita. Aggiungi righe o carica un modello salvato.
        </p>
      ) : (
        <div className="space-y-3">
          {terms.map((term, index) => {
            const preview = rows.find(
              (r) => r.label === term.label && r.isBalance === term.isBalance
            );
            return (
              <div
                key={index}
                className="rounded-lg border border-border bg-background p-3 space-y-2"
              >
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Titolo (es. Acconto all'accettazione)"
                    value={term.label}
                    onChange={(e) =>
                      updateRow(index, { label: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Testo aggiuntivo (es. prima del giorno X, a fine lavori…)"
                  value={term.note || ""}
                  onChange={(e) =>
                    updateRow(index, { note: e.target.value || undefined })
                  }
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-0.5 block text-xs text-muted-foreground">
                      %
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      disabled={term.isBalance}
                      value={term.percent ?? ""}
                      onChange={(e) =>
                        updateRow(index, {
                          percent: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                          amount: undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs text-muted-foreground">
                      Importo €
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={term.isBalance}
                      value={term.amount ?? ""}
                      onChange={(e) =>
                        updateRow(index, {
                          amount: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                          percent: undefined,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={term.isBalance === true}
                        onChange={(e) =>
                          updateRow(index, {
                            isBalance: e.target.checked,
                            percent: e.target.checked
                              ? undefined
                              : term.percent,
                            amount: e.target.checked
                              ? undefined
                              : term.amount,
                          })
                        }
                      />
                      Saldo (residuo)
                    </label>
                  </div>
                </div>
                {preview != null && grandTotal > 0 && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Importo calcolato:{" "}
                    <strong>{formatCurrency(preview.computed)}</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" /> Aggiungi rata
      </Button>

      {terms.length > 0 && grandTotal > 0 && (
        <p className="text-sm text-muted-foreground border-t border-border pt-3">
          Totale preventivo:{" "}
          <strong>{formatCurrency(grandTotal)}</strong>
          {" · "}
          Acconti: <strong>{formatCurrency(deposit)}</strong>
          {" · "}
          Saldo: <strong>{formatCurrency(balance)}</strong>
        </p>
      )}
    </div>
  );
}
