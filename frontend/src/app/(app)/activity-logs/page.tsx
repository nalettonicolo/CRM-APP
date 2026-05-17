"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { activityLogsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function ActivityLogsPage() {
  const [entityType, setEntityType] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs", entityType],
    queryFn: () =>
      activityLogsApi.list(
        entityType ? { entityType, limit: "50" } : { limit: "50" }
      ),
  });

  return (
    <>
      <Header title="Audit log" />
      <div className="p-6 space-y-4">
        <Input
          placeholder="Filtra per tipo entità (es. quote, client)..."
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="max-w-md"
        />
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Utente</th>
                    <th className="px-4 py-3 text-left">Azione</th>
                    <th className="px-4 py-3 text-left">Entità</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Caricamento...
                      </td>
                    </tr>
                  ) : (
                    data?.data.map((log) => (
                      <tr key={log.id} className="border-b border-border">
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {log.user
                            ? `${log.user.firstName} ${log.user.lastName}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">{log.action}</td>
                        <td className="px-4 py-3">
                          {log.entityType || "—"}
                          {log.entityId ? (
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              {log.entityId.slice(0, 8)}…
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {log.client?.companyName || log.client?.contactName || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
