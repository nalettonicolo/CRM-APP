import { Topbar } from "@/components/Topbar";
import { mockTeam, mockRoles } from "@/lib/mockData";

const MODULES = ["projects", "tasks", "time_entries", "chat", "docs", "whiteboards", "automations", "reports"];

export default function TeamPage() {
  return (
    <>
      <Topbar title="Team &amp; Ruoli" subtitle="Permessi granulari per modulo e azione, audit-ready" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white/80">Membri</p>
            <button className="btn-primary text-sm">+ Invita utente</button>
          </div>
          <div className="card divide-y divide-surface-border">
            {mockTeam.map((m) => (
              <div key={m.membershipId} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-surface"
                    style={{ background: m.avatarColor }}
                  >
                    {m.firstName[0]}
                    {m.lastName[0]}
                  </div>
                  <p className="text-sm font-medium">
                    {m.firstName} {m.lastName}
                  </p>
                </div>
                <span className="badge bg-brand-500/15 text-brand-300">{m.role.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 text-sm font-semibold text-white/80">Matrice permessi per ruolo</p>
          <div className="card overflow-x-auto p-5">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="pb-3 pr-4">Modulo</th>
                  {mockRoles.map((r) => (
                    <th key={r.id} className="pb-3 pr-4">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {MODULES.map((mod) => (
                  <tr key={mod}>
                    <td className="py-2.5 pr-4 text-white/70">{mod.replace("_", " ")}</td>
                    {mockRoles.map((r) => {
                      const isOwner = r.name === "Owner";
                      const hasWrite = isOwner || r.permissions.some((p) => p.module === mod && p.action === "WRITE");
                      return (
                        <td key={r.id} className="py-2.5 pr-4">
                          <span
                            className={`badge ${
                              hasWrite ? "bg-accent-green/15 text-accent-green" : "bg-white/10 text-white/50"
                            }`}
                          >
                            {isOwner ? "Full" : hasWrite ? "Read/Write" : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
