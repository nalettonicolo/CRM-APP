"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventsApi, type EventItem } from "@/lib/api";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function MonthCalendar({
  onEventSelect,
}: {
  onEventSelect: (event: EventItem) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const from = startOfMonth(cursor).toISOString();
  const to = endOfMonth(cursor).toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", from, to],
    queryFn: () => eventsApi.list(from, to),
  });

  const moveEvent = useMutation({
    mutationFn: ({ id, startAt }: { id: string; startAt: string }) =>
      eventsApi.update(id, { startAt }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = endOfMonth(cursor).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];

    for (let i = startPad; i > 0; i--) {
      const d = new Date(first);
      d.setDate(d.getDate() - i);
      cells.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(cursor.getFullYear(), cursor.getMonth(), d),
        inMonth: true,
      });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      cells.push({ date: next, inMonth: false });
    }
    return cells;
  }, [cursor]);

  const eventsForDay = (day: Date) =>
    events.filter((ev) => sameDay(new Date(ev.startAt), day));

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const monthLabel = cursor.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  function handleDrop(day: Date) {
    if (!draggingId) return;
    const ev = events.find((e) => e.id === draggingId);
    if (!ev) return;
    const old = new Date(ev.startAt);
    const next = new Date(day);
    next.setHours(old.getHours(), old.getMinutes(), 0, 0);
    moveEvent.mutate({ id: draggingId, startAt: next.toISOString() });
    setDraggingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-muted/50 px-1 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {grid.map(({ date, inMonth }, i) => {
          const dayEvents = eventsForDay(date);
          const isToday = sameDay(date, new Date());
          const isSelected = selectedDay && sameDay(date, selectedDay);

          return (
            <div
              key={i}
              onClick={() => setSelectedDay(date)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(date);
              }}
              className={cn(
                "min-h-[72px] cursor-pointer bg-card p-1 text-left transition-colors sm:min-h-[88px]",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isToday && "ring-1 ring-inset ring-primary/40",
                isSelected && "bg-primary/10"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev: EventItem) => (
                  <div
                    key={ev.id}
                    draggable
                    onDragStart={() => setDraggingId(ev.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventSelect(ev);
                    }}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] font-medium text-white cursor-grab active:cursor-grabbing",
                      draggingId === ev.id && "opacity-50"
                    )}
                    style={{
                      backgroundColor: ev.color || "var(--color-primary)",
                    }}
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Caricamento eventi…</p>
      )}

      {selectedDay && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-medium">
            Eventi del{" "}
            {selectedDay.toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nessun evento in questo giorno.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((ev) => (
                <li
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                  onClick={() => onEventSelect(ev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onEventSelect(ev);
                  }}
                >
                  <div>
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.client?.companyName || ev.client?.contactName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.startAt).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  );
}
