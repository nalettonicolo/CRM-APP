import { Topbar } from "@/components/Topbar";
import { mockAutomations } from "@/lib/mockData";

const TRIGGER_LABEL: Record<string, string> = {
  "task.created": "Quando viene creato un task",
  "task.status_changed": "Quando lo stato di un task cambia",
};
const ACTION_LABEL: Record<string, string> = {
  "task.assign": "Assegna il task a un utente",
  "task.move_column": "Sposta il task in un'altra colonna",
  "notification.send": "Invia una notifica",
};

export default function AutomationsPage() {
  return (
    <>
      <Topbar title="Automazioni" subtitle="Workflow builder: 'se succede X allora fai Y'" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-white/50">{mockAutomations.length} regole configurate</p>
          <button className="btn-primary text-sm">+ Nuova regola</button>
        </div>

        <div className="space-y-3">
          {mockAutomations.map((a) => (
            <div key={a.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className={`badge ${a.isActive ? "bg-accent-green/15 text-accent-green" : "bg-white/10 text-white/50"}`}>
                  {a.isActive ? "Attiva" : "Disattiva"}
                </span>
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="mt-1 text-sm text-white/55">
                    <span className="text-white/40">SE</span> {TRIGGER_LABEL[a.triggerType]}{" "}
                    <span className="text-white/40">→ ALLORA</span> {ACTION_LABEL[a.actionType]}
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/40">{a._count.runLogs} esecuzioni</span>
            </div>
          ))}
        </div>

        <div className="card mt-6 p-5">
          <p className="text-sm font-semibold text-white/80">Catalogo trigger &amp; azioni disponibili</p>
          <p className="mt-1 text-xs text-white/45">
            Espandibile da backend (<code className="text-brand-300">GET /api/automations/catalog</code>) senza
            toccare il frontend: nuovi trigger/azioni compaiono automaticamente nel builder.
          </p>
        </div>
      </main>
    </>
  );
}
