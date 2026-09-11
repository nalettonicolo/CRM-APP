import { Topbar } from "@/components/Topbar";
import { mockAuditLogs } from "@/lib/mockData";

const ACTION_LABEL: Record<string, string> = {
  "task.moved": "Task spostato",
  "role.permissions_updated": "Permessi ruolo aggiornati",
  "project.created": "Progetto creato",
};

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Reportistica &amp; Audit" subtitle="Storico attività enterprise, in sola lettura" />
      <main className="flex-1 overflow-y-auto p-6">
        <p className="mb-3 text-sm font-semibold text-white/80">Audit trail recente</p>
        <div className="card divide-y divide-surface-border">
          {mockAuditLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{ACTION_LABEL[log.action] ?? log.action}</p>
                <p className="text-xs text-white/45">
                  {log.user.firstName} {log.user.lastName} · {log.entityType}
                </p>
              </div>
              <span className="text-xs text-white/40">{new Date(log.createdAt).toLocaleString("it-IT")}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/40">
          Per i KPI esecutivi (progetti, task, ore) vedi la <a href="/dashboard" className="text-brand-300 hover:underline">Dashboard</a>.
        </p>
      </main>
    </>
  );
}
