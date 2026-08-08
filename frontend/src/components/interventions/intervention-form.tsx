"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientSearchSelect } from "@/components/clients/client-search-select";
import { usersApi } from "@/lib/api";
import { dateInputToIso } from "@/lib/utils";

export type InterventionFormData = {
  clientId: string;
  title: string;
  description?: string;
  location?: string;
  scheduledAt?: string;
  technicianId?: string;
};

export function InterventionForm({
  submitLabel,
  loading,
  onSubmit,
  initial,
}: {
  submitLabel: string;
  loading?: boolean;
  onSubmit: (data: InterventionFormData) => void | Promise<void>;
  initial?: Partial<InterventionFormData & { scheduledDate?: string; scheduledTime?: string }>;
}) {
  const [clientId, setClientId] = useState(initial?.clientId || "");

  const { data: users = [] } = useQuery({
    queryKey: ["users", "intervention-form"],
    queryFn: usersApi.list,
  });

  const technicians = users.filter(
    (u) => u.role === "TECHNICIAN" || u.role === "OPERATOR"
  );

  const scheduledDefault = initial?.scheduledAt
    ? new Date(initial.scheduledAt)
    : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = String(fd.get("title") || "").trim();
        const description = String(fd.get("description") || "").trim();
        const location = String(fd.get("location") || "").trim();
        const scheduledDate = String(fd.get("scheduledDate") || "");
        const scheduledTime = String(fd.get("scheduledTime") || "09:00");
        const technicianId = String(fd.get("technicianId") || "");

        if (!clientId || !title) return;

        const payload: InterventionFormData = {
          clientId,
          title,
          ...(description && { description }),
          ...(location && { location }),
          ...(technicianId && { technicianId }),
        };

        if (scheduledDate) {
          const [h, m] = scheduledTime.split(":").map(Number);
          payload.scheduledAt = dateInputToIso(scheduledDate, h || 9);
          if (m) {
            const d = new Date(payload.scheduledAt);
            d.setMinutes(m);
            payload.scheduledAt = d.toISOString();
          }
        }

        void onSubmit(payload);
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Cliente *</label>
        <ClientSearchSelect
          value={clientId}
          onChange={(id) => setClientId(id)}
          placeholder="Cerca o crea cliente…"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Titolo *</label>
        <Input
          name="title"
          required
          defaultValue={initial?.title || ""}
          placeholder="Es. Manutenzione impianto"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descrizione</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description || ""}
          className="flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          placeholder="Note sull'intervento"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Luogo</label>
        <Input
          name="location"
          defaultValue={initial?.location || ""}
          placeholder="Indirizzo o sede"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Data programmata</label>
          <Input
            type="date"
            name="scheduledDate"
            defaultValue={
              initial?.scheduledDate ||
              (scheduledDefault
                ? `${scheduledDefault.getFullYear()}-${String(scheduledDefault.getMonth() + 1).padStart(2, "0")}-${String(scheduledDefault.getDate()).padStart(2, "0")}`
                : "")
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ora</label>
          <Input
            type="time"
            name="scheduledTime"
            defaultValue={
              initial?.scheduledTime ||
              (scheduledDefault
                ? `${String(scheduledDefault.getHours()).padStart(2, "0")}:${String(scheduledDefault.getMinutes()).padStart(2, "0")}`
                : "09:00")
            }
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tecnico assegnato</label>
        <select
          name="technicianId"
          defaultValue={initial?.technicianId || ""}
          className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="">Predefinito (utente corrente)</option>
          {technicians.map((u) => (
            <option key={u.id} value={u.id}>
              {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Salvataggio…" : submitLabel}
      </Button>
    </form>
  );
}
