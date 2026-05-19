"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { EventHubDialog } from "@/components/calendar/event-hub-dialog";
import type { EventItem } from "@/lib/api";
import { UpcomingEventsPanel } from "@/components/events/upcoming-events-panel";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { eventsApi } from "@/lib/api";
import { calendarEventTypeOptions } from "@/lib/labels";

export default function CalendarPage() {
  const [hubEvent, setHubEvent] = useState<EventItem | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("EVENT");
  const [eventFrom, setEventFrom] = useState("");
  const [eventTo, setEventTo] = useState("");
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

  const createMut = useMutation({
    mutationFn: () => {
      const start = new Date(`${eventFrom}T10:00:00`);
      const endDay = eventTo || eventFrom;
      const end = new Date(`${endDay}T18:00:00`);
      return eventsApi.create({
        title,
        type,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      setTitle("");
      setEventFrom("");
      setEventTo("");
    },
  });

  return (
    <>
      <Header title="Calendario" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Vista mensile e lista dei prossimi appuntamenti
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo evento
          </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Titolo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {calendarEventTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Data evento (da)</label>
              <Input
                type="date"
                value={eventFrom}
                onChange={(e) => setEventFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Data evento (a)</label>
              <Input
                type="date"
                value={eventTo}
                min={eventFrom || undefined}
                onChange={(e) => setEventTo(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Orario predefinito: inizio 10:00, fine 18:00 (ultimo giorno).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={!title || !eventFrom || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
