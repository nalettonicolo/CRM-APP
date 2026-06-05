"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { SiteVisitForm } from "@/components/site-visits/site-visit-form";
import { siteVisitsApi } from "@/lib/api";

export default function SiteVisitPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const { data: sheet, isLoading, isError } = useQuery({
    queryKey: ["site-visit", "event", eventId],
    queryFn: () => siteVisitsApi.getByEvent(eventId),
    enabled: !!eventId,
  });

  return (
    <>
      <Header title="Scheda sopralluogo" />
      <div className="p-4 sm:p-6">
        <Link
          href="/calendar"
          className="mb-4 inline-block text-sm text-primary hover:underline"
        >
          ← Calendario
        </Link>

        {isLoading && (
          <p className="text-muted-foreground">Caricamento scheda…</p>
        )}
        {isError && (
          <p className="text-red-600">
            Impossibile aprire la scheda sopralluogo.
          </p>
        )}
        {sheet && <SiteVisitForm sheet={sheet} />}
      </div>
    </>
  );
}
