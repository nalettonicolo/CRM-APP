"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { EventHubDialog } from "@/components/calendar/event-hub-dialog";
import type { EventItem } from "@/lib/api";
import { UpcomingEventsPanel } from "@/components/events/upcoming-events-panel";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/components/ui/field-label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError, eventsApi } from "@/lib/api";
import { allEventTypeOptions } from "@/lib/labels";
import { SECTION_CREATE } from "@/lib/section-create";
import { PageCreateButton } from "@/components/layout/page-create-action";
import { ClientSearchSelect } from "@/components/clients/client-search-select";
import { useWorkspace } from "@/contexts/workspace-context";

export default function CalendarPage() {
  const router = useRouter();
  const workspace = useWorkspace();
  const [hubEvent, setHubEvent] = useState<EventItem | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("EVENT");
  const [eventFrom, setEventFrom] = useState("");
  const [eventTo, setEventTo] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [createError, setCreateError] = useState("");
  const qc = useQueryClient();

  const upcomingFrom = useMemo(() => new Date().toISOString(), []);

  const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: async () => {
      const all = await eventsApi.list(upcomingFrom);
      return all
        .filter((e) => new Date(e.startAt) >= new Date())
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        )
        .slice(0, 12);
    },
  });

  function resetCreateForm() {
    setTitle("");
    setLocation("");
    setDescription("");
    setClientId("");
    setType("EVENT");
    setEventFrom("");
    setEventTo("");
    setStartTime("10:00");
    setEndTime("18:00");
  }

  const createMut = useMutation({
    mutationFn: (allowOverlap: boolean) => {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const [y1, m1, d1] = eventFrom.split("-").map(Number);
      const endDay = eventTo || eventFrom;
      const [y2, m2, d2] = endDay.split("-").map(Number);
      const startAt = new Date(y1, m1 - 1, d1, sh, sm, 0).toISOString();
      const endAt = new Date(y2, m2 - 1, d2, eh, em, 0).toISOString();
      return eventsApi.create({
        title,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        clientId: clientId || undefined,
        type,
        startAt,
        endAt,
        allowOverlap: allowOverlap || undefined,
      });
    },
    onSuccess: (created) => {
      setCreateError("");
      qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      resetCreateForm();
      if (created.type === "SITE_VISIT") {
        router.push(`/site-visits/${created.id}`);
      }
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.code === "SCHEDULE_CONFLICT") {
        const names = (err.conflicts as Array<{ title?: string }> | undefined)
          ?.map((c) => c.title)
          .filter(Boolean)
          .join(", ");
        const ok = window.confirm(
          `${err.message}\n\nIn conflitto: ${names || "altri impegni"}.\n\nVuoi salvarlo comunque?`
        );
        if (ok) createMut.mutate(true);
        return;
      }
      setCreateError(err instanceof Error ? err.message : "Errore salvataggio");
    },
  });

  return (
    <>
      <WorkspaceHeader title="Calendario" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {workspace === "ie"
              ? "Calendario condiviso con Nicolò Service: gli impegni non si sovrappongono salvo tua conferma."
              : "Vista mensile e lista dei prossimi appuntamenti"}
          </p>
          <PageCreateButton
            label={SECTION_CREATE.event}
            onClick={() => setOpen(true)}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="order-2 xl:order-1 xl:col-span-2">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <MonthCalendar onEventSelect={setHubEvent} />
              </CardContent>
            </Card>
          </div>
          <div className="order-1 xl:order-2 xl:col-span-1">
            <UpcomingEventsPanel
              events={upcoming}
              loading={upcomingLoading}
              variant="sidebar"
              onEventClick={setHubEvent}
            />
          </div>
        </div>
      </div>

      <EventHubDialog
        event={hubEvent}
        open={!!hubEvent}
        onOpenChange={(isOpen) => {
          if (!isOpen) setHubEvent(null);
        }}
        onEventUpdated={setHubEvent}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Titolo *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Luogo (opzionale)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Cliente (opzionale)
              </label>
              <ClientSearchSelect
                value={clientId}
                onChange={(id) => setClientId(id)}
                placeholder="Cerca o crea cliente…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Tipo
              </label>
              <select
                className={appSelectClass}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {allEventTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {type === "SITE_VISIT" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Dopo la creazione si apre la scheda sopralluogo per
                  annotazioni e foto (non è un verbale).
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Data inizio *
                </label>
                <Input
                  type="date"
                  value={eventFrom}
                  onChange={(e) => setEventFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Ora inizio
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Data fine
                </label>
                <Input
                  type="date"
                  value={eventTo}
                  min={eventFrom || undefined}
                  onChange={(e) => setEventTo(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Ora fine
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <textarea
              className="flex min-h-[64px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              placeholder="Descrizione (opzionale)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={!title || !eventFrom || createMut.isPending}
              onClick={() => createMut.mutate(false)}
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
