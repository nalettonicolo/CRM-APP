"use client";

import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { mockKpis, mockTimeByUser } from "@/lib/mockData";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_LABEL: Record<string, string> = {
  TODO: "Da fare",
  IN_PROGRESS: "In corso",
  IN_REVIEW: "Revisione",
  DONE: "Fatto",
  BLOCKED: "Bloccato",
};

const STATUS_COLOR: Record<string, string> = {
  TODO: "#B7A3FF",
  IN_PROGRESS: "#3ED9D9",
  IN_REVIEW: "#F5A524",
  DONE: "#22C55E",
  BLOCKED: "#FB4E75",
};

export default function DashboardPage() {
  const kpis = mockKpis;

  return (
    <>
      <Topbar title="Dashboard" subtitle="Panoramica executive dell'organizzazione" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Progetti attivi" value={kpis.activeProjects} accent="#7C5CFC" />
          <KpiCard label="Task aperti" value={kpis.openTasks} accent="#3ED9D9" />
          <KpiCard label="Task in ritardo" value={kpis.overdueTasks} accent="#FB4E75" hint="Scadenza superata" />
          <KpiCard label="Ore ultimi 30gg" value={`${kpis.hoursLast30Days}h`} accent="#F5A524" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <p className="mb-4 text-sm font-semibold text-white/80">Task per stato</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kpis.taskByStatus}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {kpis.taskByStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1D1E42", border: "1px solid #2C2E5C", borderRadius: 8 }}
                    formatter={(value: number, _name, entry) => [value, STATUS_LABEL[entry.payload.status]]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/60">
              {kpis.taskByStatus.map((s) => (
                <span key={s.status} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />
                  {STATUS_LABEL[s.status]} ({s.count})
                </span>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="mb-4 text-sm font-semibold text-white/80">Ore registrate per persona (30gg)</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTimeByUser}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2E5C" />
                  <XAxis dataKey="name" stroke="#8B8DBE" fontSize={12} />
                  <YAxis stroke="#8B8DBE" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#1D1E42", border: "1px solid #2C2E5C", borderRadius: 8 }} />
                  <Bar dataKey="hours" fill="#7C5CFC" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
