"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { portalApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function PortalEventsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: portalApi.dashboard,
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => portalApi.confirmEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-dashboard"] }),
  });

  const events = data?.events ?? [];

  return (
    <>
      <Header title="Appuntamenti" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link href="/portal" className="text-sm text-primary hover:underline">
          ← Area cliente
        </Link>

        {isLoading ? (
          <p className="mt-4 text-muted-foreground">Caricamento…</p>
        ) : events.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="p-8 text-center text-muted-foreground">
              Nessun appuntamento in programma.
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-4 space-y-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{ev.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(ev.startAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={confirmMut.isPending}
                      onClick={() => confirmMut.mutate(ev.id)}
                    >
                      <Check className="h-4 w-4" /> Conferma presenza
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
