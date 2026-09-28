import Link from "next/link";

// Landing minimale: presenta il prodotto e porta alla dashboard demo.
// In produzione qui andrebbe il login; per la fase "solo visivo" iniziale
// il link salta direttamente alla dashboard con dati demo.
export default function Home() {
  const modules = [
    { name: "Progetti & Task", desc: "Board Kanban, sottotask, priorità, scadenze" },
    { name: "Time Tracking", desc: "Cronometro e registrazioni manuali per commessa" },
    { name: "Chat di team", desc: "Canali interni, pubblici e privati" },
    { name: "Docs & Wiki", desc: "Documentazione collaborativa aziendale" },
    { name: "Whiteboard", desc: "Lavagna visuale condivisa" },
    { name: "Automazioni", desc: "Regole 'se succede X allora fai Y'" },
    { name: "Reportistica BI", desc: "Dashboard executive con KPI in tempo reale" },
    { name: "Ruoli & Audit", desc: "Permessi granulari e audit trail enterprise" },
  ];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center">
        <span className="badge bg-brand-500/15 text-brand-300">Nicolò Service · Enterprise</span>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Il gestionale enterprise che affianca il tuo CRM
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">
          Progetti, task, automazioni, chat, docs, whiteboard, time tracking e BI —
          tutto in un unico ambiente, con ruoli granulari e audit trail pensati per un&apos;azienda che cresce.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/dashboard" className="btn-primary">
            Apri la dashboard demo →
          </Link>
          <a
            href="https://github.com/nalettonicolo/crm-app"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-surface-border px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Gestionale CRM attuale
          </a>
        </div>

        <div className="mt-20 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div key={m.name} className="card p-5 text-left">
              <p className="font-semibold">{m.name}</p>
              <p className="mt-1 text-sm text-white/60">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
