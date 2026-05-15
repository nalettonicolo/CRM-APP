"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Building2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientsApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-700 dark:text-green-400",
  LEAD: "bg-blue-500/15 text-blue-700",
  PROSPECT: "bg-amber-500/15 text-amber-700",
  INACTIVE: "bg-gray-500/15 text-gray-600",
  ARCHIVED: "bg-red-500/15 text-red-600",
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => clientsApi.list(search ? { search } : undefined),
  });

  return (
    <>
      <Header title="Clienti" />
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca clienti..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button>
            <Plus className="h-4 w-4" /> Nuovo cliente
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.data.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/clients/${client.id}`}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <motion.div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {client.companyName ||
                                client.contactName ||
                                "Cliente"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {client.email || client.phone}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            statusColors[client.status] || statusColors.LEAD
                          )}
                        >
                          {client.status}
                        </span>
                      </motion.div>
                      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                        <span>{client._count?.quotes ?? 0} preventivi</span>
                        <span>{client._count?.interventions ?? 0} interventi</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
