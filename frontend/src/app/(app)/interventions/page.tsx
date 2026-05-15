"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { interventionsApi } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

export default function InterventionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["interventions"],
    queryFn: interventionsApi.list,
  });

  return (
    <>
      <Header title="Interventi" />
      <div className="p-6 space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : (
          data?.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-5">
                <motion.div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.number}
                  </p>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.client?.companyName || item.client?.contactName}
                  </p>
                </motion.div>
                <div className="text-right">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      item.status === "COMPLETED"
                        ? "bg-green-500/15 text-green-700"
                        : "bg-blue-500/15 text-blue-700"
                    )}
                  >
                    {item.status}
                  </span>
                  {item.scheduledAt && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(item.scheduledAt)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
