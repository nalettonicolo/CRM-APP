"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  Wrench,
  Package,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

const statCards = [
  { key: "interventionsToday", label: "Interventi oggi", icon: Wrench, color: "text-blue-500" },
  { key: "openQuotes", label: "Preventivi aperti", icon: FileText, color: "text-amber-500" },
  { key: "acceptedQuotes", label: "Preventivi accettati", icon: TrendingUp, color: "text-green-500" },
  { key: "techniciansAvailable", label: "Tecnici attivi", icon: Users, color: "text-purple-500" },
] as const;

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.stats,
  });

  const chartData = [
    { name: "Aperti", value: data?.openQuotes ?? 0 },
    { name: "Accettati", value: data?.acceptedQuotes ?? 0 },
    { name: "Clienti", value: data?.kpis?.clients ?? 0 },
  ];

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-xl bg-muted p-3 ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">
                      {isLoading
                        ? "—"
                        : String(data?.[stat.key as keyof typeof data] ?? 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>KPI Operativi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {data?.kpis?.revenue?._sum?.total != null && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Fatturato preventivi accettati:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(Number(data.kpis.revenue._sum.total))}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alert magazzino
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.lowStock?.length ? (
                <ul className="space-y-2">
                  {data.lowStock.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-amber-600" />
                        {item.productName}
                      </span>
                      <span className="font-mono text-amber-700 dark:text-amber-400">
                        {item.quantity}/{item.minStock}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nessun alert — scorte OK
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prossimi eventi</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data?.upcomingEvents?.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                  >
                    <span className="font-medium">{ev.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(ev.startAt)}
                    </span>
                  </li>
                )) ?? (
                  <p className="text-sm text-muted-foreground">Nessun evento</p>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ultime attività</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data?.recentActivity?.map((act) => (
                  <li key={act.id} className="text-sm">
                    <span className="font-medium">
                      {act.user?.firstName} {act.user?.lastName}
                    </span>{" "}
                    <span className="text-muted-foreground">{act.action}</span>
                    <span className="float-right text-xs text-muted-foreground">
                      {formatDate(act.createdAt)}
                    </span>
                  </li>
                )) ?? (
                  <p className="text-sm text-muted-foreground">Nessuna attività</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
