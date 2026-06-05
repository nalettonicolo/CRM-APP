"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { siteVisitsApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

function clientLabel(sheet: {
  client?: { companyName?: string; contactName?: string };
}) {
  return (
    sheet.client?.companyName || sheet.client?.contactName || "—"
  );
}

export default function SiteVisitsPage() {
  const { data: sheets = [], isLoading, isError } = useQuery({
    queryKey: ["site-visits"],
    queryFn: siteVisitsApi.list,
    refetchOnWindowFocus: true,
  });

  return (
    <>
      <Header title="Sopralluoghi" />
      <div className="p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Schede di rilevazione sul luogo con annotazioni e foto. Per crearne una
          nuova, apri il{" "}
          <Link href="/calendar" className="text-primary hover:underline">
            calendario
          </Link>{" "}
          e imposta un evento come <strong>Sopralluogo</strong>.
        </p>

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento…</p>
        ) : isError ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-red-600">
              Errore nel caricamento delle schede. Riprova tra poco.
            </CardContent>
          </Card>
        ) : sheets.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nessuna scheda sopralluogo ancora.
              <br />
              <Link href="/calendar" className="mt-2 inline-block text-primary hover:underline">
                Vai al calendario
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {sheets.map((sheet) => (
              <li key={sheet.eventId}>
                <Link
                  href={`/site-visits/${sheet.eventId}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {sheet.event?.title || sheet.number}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {sheet.location || "Luogo da definire"}
                        {clientLabel(sheet) !== "—"
                          ? ` · ${clientLabel(sheet)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        sheet.pending
                          ? "bg-blue-500/15 text-blue-800"
                          : sheet.status === "COMPLETED"
                            ? "bg-green-500/15 text-green-700"
                            : "bg-amber-500/15 text-amber-800"
                      )}
                    >
                      {sheet.pending
                        ? "Da compilare"
                        : sheet.status === "COMPLETED"
                          ? "Completata"
                          : "Bozza"}
                    </span>
                    {sheet.event?.startAt && (
                      <span className="text-muted-foreground">
                        {formatDate(sheet.event.startAt)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
