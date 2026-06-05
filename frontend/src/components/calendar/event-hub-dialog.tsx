"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ClipboardList,
  ExternalLink,
  FileText,
  MapPin,
  Receipt,
  User,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { eventsApi, type EventItem } from "@/lib/api";
import { calendarEventTypeOptions, eventTypeLabels } from "@/lib/labels";
import { formatCurrency, toDateInputValue } from "@/lib/utils";

type HubAction = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary";
};

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function eventToForm(event: EventItem) {
  const end = event.endAt ? new Date(event.endAt) : new Date(event.startAt);
  return {
    title: event.title,
    type: event.type || "EVENT",
    location: event.location || event.quote?.eventLocation || "",
    description: event.description || "",
    eventFrom: toDateInputValue(event.startAt),
    eventTo: event.endAt
      ? toDateInputValue(event.endAt)
      : toDateInputValue(event.startAt),
    startTime: toTimeInputValue(event.startAt),
    endTime: toTimeInputValue(end.toISOString()),
  };
}

function buildActions(event: EventItem): HubAction[] {
  const actions: HubAction[] = [];
  const clientId = event.clientId;

  if (clientId) {
    actions.push({
      href: `/clients/${clientId}`,
      label: "Scheda cliente",
      icon: User,
      variant: "outline",
    });
  }

  const quoteId = event.quoteId || event.quote?.id;
  if (quoteId) {
    actions.push({
      href: `/quotes/${quoteId}`,
      label: event.quote?.number
        ? `Preventivo ${event.quote.number}`
        : "Apri preventivo",
      icon: FileText,
      variant: "default",
    });
    actions.push({
      href: `/payments?quoteId=${quoteId}`,
      label: "Pagamenti",
      icon: Receipt,
      variant: "outline",
    });
  }

  const interventionId = event.interventionId || event.intervention?.id;
  if (interventionId) {
    actions.push({
      href: `/interventions/${interventionId}`,
      label: event.intervention?.number
        ? `Intervento ${event.intervention.number}`
        : "Apri intervento",
      icon: Wrench,
      variant: quoteId ? "outline" : "default",
    });
  }

  if (event.type === "SITE_VISIT") {
    actions.unshift({
      href: `/site-visits/${event.id}`,
      label: "Scheda sopralluogo",
      icon: MapPin,
      variant: "default",
    });
  } else if (clientId || interventionId) {
    const reportParams = new URLSearchParams();
    if (clientId) reportParams.set("clientId", clientId);
    if (quoteId) reportParams.set("quoteId", quoteId);
    if (interventionId) reportParams.set("interventionId", interventionId);
    actions.push({
      href: `/reports/new?${reportParams.toString()}`,
      label: "Crea verbale",
      icon: ClipboardList,
      variant: "secondary",
    });
  }

  return actions;
}

export function EventHubDialog({
  event,
  open,
  onOpenChange,
  onEventUpdated,
}: {
  event: EventItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: (event: EventItem) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState(() => (event ? eventToForm(event) : null));

  useEffect(() => {
    if (event) setForm(eventToForm(event));
  }, [event?.id, event?.title, event?.type, event?.location, event?.description, event?.startAt, event?.endAt]);

  const updateMut = useMutation({
    mutationFn: () => {
      if (!event || !form) throw new Error("Evento non disponibile");
      const [sh, sm] = form.startTime.split(":").map(Number);
      const [eh, em] = form.endTime.split(":").map(Number);
      const [y1, m1, d1] = form.eventFrom.split("-").map(Number);
      const endDay = form.eventTo || form.eventFrom;
      const [y2, m2, d2] = endDay.split("-").map(Number);
      const startAt = new Date(y1, m1 - 1, d1, sh, sm, 0).toISOString();
      const endAt = new Date(y2, m2 - 1, d2, eh, em, 0).toISOString();
      return eventsApi.update(event.id, {
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        type: form.type,
        startAt,
        endAt,
      });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      onEventUpdated?.(updated);
      setForm(eventToForm(updated));
    },
  });

  const openSiteVisitMut = useMutation({
    mutationFn: async () => {
      if (!event || !form) throw new Error("Evento non disponibile");
      const [sh, sm] = form.startTime.split(":").map(Number);
      const [eh, em] = form.endTime.split(":").map(Number);
      const [y1, m1, d1] = form.eventFrom.split("-").map(Number);
      const endDay = form.eventTo || form.eventFrom;
      const [y2, m2, d2] = endDay.split("-").map(Number);
      const startAt = new Date(y1, m1 - 1, d1, sh, sm, 0).toISOString();
      const endAt = new Date(y2, m2 - 1, d2, eh, em, 0).toISOString();
      await eventsApi.update(event.id, {
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        type: "SITE_VISIT",
        startAt,
        endAt,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
      router.push(`/site-visits/${event!.id}`);
    },
  });

  const deleteEventMut = useMutation({
    mutationFn: () => eventsApi.delete(event!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
    },
  });

  if (!event || !form) return null;

  const clientName =
    event.client?.companyName || event.client?.contactName || null;
  const actions = buildActions(event);
  const hasLinks = actions.length > 0;
  const hasLinkedEntities = !!(event.quoteId || event.clientId || event.interventionId);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 shrink-0 text-primary" />
            Modifica evento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Titolo</label>
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Data inizio</label>
              <Input
                type="date"
                value={form.eventFrom}
                onChange={(e) => setField("eventFrom", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Ora inizio</label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setField("startTime", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Data fine</label>
              <Input
                type="date"
                value={form.eventTo}
                min={form.eventFrom || undefined}
                onChange={(e) => setField("eventTo", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Ora fine</label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setField("endTime", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Luogo</label>
            <Input
              value={form.location}
              placeholder="Es. Villa Rossi, Via Roma 12, Milano"
              onChange={(e) => setField("location", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
            <select
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={form.type}
              disabled={openSiteVisitMut.isPending}
              onChange={(e) => {
                const next = e.target.value;
                setField("type", next);
                if (next === "SITE_VISIT") {
                  openSiteVisitMut.mutate();
                }
              }}
            >
              {calendarEventTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              {!calendarEventTypeOptions.some((o) => o.value === event.type) &&
                event.type && (
                  <option value={event.type}>
                    {eventTypeLabels[event.type] || event.type}
                  </option>
                )}
            </select>
          </div>

          {(form.type === "SITE_VISIT" || event.type === "SITE_VISIT") && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">Scheda sopralluogo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Annotazioni tecniche e foto del luogo — documento separato dal
                verbale di fine lavoro.
              </p>
              <Button
                className="mt-3 w-full justify-start"
                variant="default"
                disabled={openSiteVisitMut.isPending}
                onClick={() => openSiteVisitMut.mutate()}
              >
                <MapPin className="h-4 w-4" />
                {openSiteVisitMut.isPending
                  ? "Apertura scheda…"
                  : "Apri scheda sopralluogo"}
              </Button>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Descrizione</label>
            <textarea
              className="flex min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              value={form.description}
              placeholder="Note sull'evento (opzionale)"
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>

          {hasLinkedEntities && (
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3">
              {clientName && (
                <div>
                  <dt className="text-xs text-muted-foreground">Cliente collegato</dt>
                  <dd className="font-medium">{clientName}</dd>
                </div>
              )}
              {event.quote?.number && (
                <div>
                  <dt className="text-xs text-muted-foreground">Preventivo collegato</dt>
                  <dd className="font-medium">
                    {event.quote.number}
                    {event.quote.total != null &&
                      ` · ${formatCurrency(Number(event.quote.total))}`}
                  </dd>
                </div>
              )}
              {event.intervention?.number && (
                <div>
                  <dt className="text-xs text-muted-foreground">Intervento collegato</dt>
                  <dd className="font-medium">{event.intervention.number}</dd>
                </div>
              )}
            </dl>
          )}

          {hasLinks && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Collegamenti</p>
              {actions.map((a) => (
                <Button
                  key={a.href}
                  variant={a.variant ?? "outline"}
                  className="justify-start"
                  asChild
                >
                  <Link href={a.href}>
                    <a.icon className="h-4 w-4" />
                    {a.label}
                    <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
                  </Link>
                </Button>
              ))}
            </div>
          )}

          {updateMut.isError && (
            <p className="text-xs text-red-600">Impossibile salvare le modifiche.</p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button
              className="flex-1"
              disabled={!form.title.trim() || !form.eventFrom || updateMut.isPending}
              onClick={() => updateMut.mutate()}
            >
              Salva
            </Button>
          </div>
          <DeleteEntityButton
            className="w-full"
            pending={deleteEventMut.isPending}
            confirmMessage={`Eliminare l'evento "${event.title}"?`}
            onConfirm={() => deleteEventMut.mutate()}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
