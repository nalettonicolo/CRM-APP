"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventItem } from "@/lib/api";
import { eventTypeLabels } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";

function formatEventWhen(startAt: string, allDay?: boolean) {
  const d = new Date(startAt);
  if (allDay) return formatDate(startAt);
  return d.toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clientLabel(ev: EventItem) {
  return (
    ev.client?.companyName ||
    ev.client?.contactName ||
    null
  );
}

export function UpcomingEventsPanel({
  events,
  loading,
  variant = "default",
  className,
  onEventClick,
}: {
  events?: EventItem[];
  loading?: boolean;
  variant?: "default" | "prominent" | "sidebar";
  className?: string;
  onEventClick?: (event: EventItem) => void;
}) {
  const list = events ?? [];
  const isProminent = variant === "prominent";
  const isSidebar = variant === "sidebar";

  const inner = (
    <>
      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento eventi…</p>
      ) : list.length === 0 ? (
        <div
          className={cn(
            "rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center",
            isProminent && "py-10"
          )}
        >
          <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Nessun evento in programma</p>
          <Button variant="ghost" size="sm" className="mt-2" asChild>
            <Link href="/calendar">Vai al calendario</Link>
          </Button>
        </div>
      ) : (
        <ul
          className={cn(
            "space-y-2",
            isProminent &&
              "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:space-y-0"
          )}
        >
          {list.map((ev) => (
            <li
              key={ev.id}
              className={cn(
                "group rounded-xl border border-border bg-card transition-colors hover:border-primary/30 hover:bg-primary/5",
                isProminent ? "p-4 shadow-sm" : "px-3 py-2.5",
                isSidebar && "border-primary/20 bg-primary/5",
                onEventClick && "cursor-pointer"
              )}
              role={onEventClick ? "button" : undefined}
              tabIndex={onEventClick ? 0 : undefined}
              onClick={onEventClick ? () => onEventClick(ev) : undefined}
              onKeyDown={
                onEventClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onEventClick(ev);
                      }
                    }
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary",
                    isProminent ? "h-10 w-10" : "h-8 w-8"
                  )}
                >
                  <Calendar className={isProminent ? "h-5 w-5" : "h-4 w-4"} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-semibold leading-snug text-foreground",
                      isProminent ? "text-base" : "text-sm"
                    )}
                  >
                    {ev.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatEventWhen(ev.startAt, ev.allDay)}
                    </span>
                    {ev.type && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {eventTypeLabels[ev.type] || ev.type}
                      </span>
                    )}
                  </p>
                  {clientLabel(ev) && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {clientLabel(ev)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (isSidebar) {
    return (
      <Card className={cn("border-primary/20 shadow-md", className)}>
        <CardHeader className="border-b border-border bg-primary/5 pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Prossimi eventi
            </span>
            {list.length > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {list.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[min(32rem,70vh)] overflow-y-auto p-4">
          {inner}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        isProminent && "border-primary/25 shadow-md ring-1 ring-primary/10",
        className
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          isProminent && "border-b border-border bg-gradient-to-r from-primary/10 to-transparent pb-4"
        )}
      >
        <CardTitle
          className={cn(
            "flex items-center gap-2",
            isProminent ? "text-xl" : "text-base"
          )}
        >
          <Calendar className={cn("text-primary", isProminent ? "h-6 w-6" : "h-5 w-5")} />
          Prossimi eventi
          {list.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary">
              {list.length}
            </span>
          )}
        </CardTitle>
        <Button variant={isProminent ? "default" : "outline"} size="sm" asChild>
          <Link href="/calendar">
            Calendario
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className={cn(isProminent && "pt-6")}>{inner}</CardContent>
    </Card>
  );
}
