"use client";

import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  ExternalLink,
  FileText,
  Receipt,
  User,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EventItem } from "@/lib/api";
import { eventTypeLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

function formatEventTime(ev: EventItem) {
  const d = new Date(ev.startAt);
  if (ev.allDay) return formatDate(ev.startAt);
  return d.toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type HubAction = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary";
};

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
    actions.push({
      href: `/reports/new?interventionId=${interventionId}`,
      label: "Crea report",
      icon: ClipboardList,
      variant: "secondary",
    });
  }

  return actions;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function EventHubDialog({
  event,
  open,
  onOpenChange,
}: {
  event: EventItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!event) return null;

  const clientName =
    event.client?.companyName || event.client?.contactName || null;
  const actions = buildActions(event);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-6">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>{event.title}</span>
          </DialogTitle>
        </DialogHeader>

        <dl className="grid gap-2 text-sm">
          <MetaRow label="Quando" value={formatEventTime(event)} />
          {event.type && (
            <MetaRow
              label="Tipo"
              value={eventTypeLabels[event.type] || event.type}
            />
          )}
          {clientName && <MetaRow label="Cliente" value={clientName} />}
          {event.quote?.total != null && (
            <MetaRow
              label="Totale preventivo"
              value={formatCurrency(Number(event.quote.total))}
            />
          )}
        </dl>

        {event.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </p>
        )}

        {actions.length > 0 ? (
          <div className="flex flex-col gap-2 pt-2">
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Nessun collegamento rapido per questo evento.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
