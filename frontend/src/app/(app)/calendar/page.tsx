"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { eventsApi } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  APPOINTMENT: "border-l-blue-500",
  INTERVENTION: "border-l-purple-500",
  DEADLINE: "border-l-red-500",
  REMINDER: "border-l-amber-500",
  MEETING: "border-l-green-500",
  OTHER: "border-l-gray-400",
};

export default function CalendarPage() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["events", from, to],
    queryFn: () => eventsApi.list(from, to),
  });

  return (
    <>
      <Header title="Calendario" />
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <p className="text-muted-foreground">Caricamento eventi...</p>
            ) : data?.length ? (
              <div className="space-y-3">
                {data.map((ev, i) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "rounded-lg border border-border border-l-4 bg-card p-4",
                      typeColors[ev.type || "OTHER"] || typeColors.OTHER
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{ev.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {ev.client?.companyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        {formatDate(ev.startAt)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                Nessun evento questo mese
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
