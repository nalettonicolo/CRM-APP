"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { quotesApi } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SENT: "bg-blue-500/15 text-blue-700",
  ACCEPTED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
  EXPIRED: "bg-amber-500/15 text-amber-700",
};

export default function QuotesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => quotesApi.list(),
  });

  return (
    <>
      <Header title="Preventivi" />
      <motion.div className="p-6">
        <div className="mb-6 flex justify-end">
          <Button>
            <Plus className="h-4 w-4" /> Nuovo preventivo
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Numero</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Titolo</th>
                    <th className="px-4 py-3 text-left font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Totale</th>
                    <th className="px-4 py-3 text-right font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Caricamento...
                      </td>
                    </tr>
                  ) : (
                    data?.data.map((q) => (
                      <tr
                        key={q.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{q.number}</td>
                        <td className="px-4 py-3">
                          {q.client?.companyName || q.client?.contactName}
                        </td>
                        <td className="px-4 py-3">{q.title || "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              statusStyle[q.status]
                            )}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(Number(q.total))}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatDate(q.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
