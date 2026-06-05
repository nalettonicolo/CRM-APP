"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Client } from "@/lib/api";
import {
  getClientBillingStatus,
  isClientBillingComplete,
} from "@/lib/client-billing";
import { cn } from "@/lib/utils";

export function ClientBillingStatus({
  client,
  onEdit,
}: {
  client: Client;
  onEdit?: () => void;
}) {
  const fields = getClientBillingStatus(client);
  const complete = isClientBillingComplete(client);
  const missing = fields.filter((f) => !f.ok);

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        complete
          ? "border-green-500/30 bg-green-500/5"
          : "border-amber-500/35 bg-amber-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        {complete ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {complete
              ? "Dati fatturazione completi"
              : "Dati fatturazione incompleti"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {complete
              ? "L'anagrafica contiene i campi principali per documenti di cortesia e fatturazione elettronica."
              : "Completa l'anagrafica prima di emettere documenti o esportare per la fatturazione."}
          </p>

          {!complete && (
            <ul className="mt-3 space-y-1 text-sm">
              {missing.map((field) => (
                <li key={field.key} className="text-amber-900">
                  <span className="font-medium">{field.label}</span>
                  {field.hint ? (
                    <span className="text-muted-foreground"> — {field.hint}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {onEdit ? (
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={onEdit}
              >
                Completa anagrafica →
              </button>
            ) : (
              <Link
                href={`/clients/${client.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Vai alla scheda cliente →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
