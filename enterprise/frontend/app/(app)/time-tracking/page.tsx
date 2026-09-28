"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { mockTimeByUser } from "@/lib/mockData";

const RECENT_ENTRIES = [
  { id: "1", task: "Installazione quadro elettrico — Via Roma 12", user: "Marco Tecnico", duration: "2h 15m", when: "Oggi, 09:10" },
  { id: "2", task: "Sopralluogo cliente Rossi Srl", user: "Nicolò Admin", duration: "0h 45m", when: "Oggi, 08:30" },
  { id: "3", task: "Configurazione centralina Ajax Hub 2", user: "Giulia Amministrazione", duration: "1h 30m", when: "Ieri, 16:00" },
];

export default function TimeTrackingPage() {
  const [running, setRunning] = useState(false);

  return (
    <>
      <Topbar title="Time Tracking" subtitle="Cronometro per task e registrazioni manuali" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="card flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-white/55">Cronometro attivo</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{running ? "00:12:47" : "00:00:00"}</p>
            {running && <p className="text-xs text-white/40">Installazione quadro elettrico — Via Roma 12</p>}
          </div>
          <button
            onClick={() => setRunning((r) => !r)}
            className={running ? "rounded-xl bg-accent-rose/90 px-5 py-2 text-sm font-semibold text-surface" : "btn-primary"}
          >
            {running ? "■ Ferma" : "▶ Avvia cronometro"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <p className="mb-3 text-sm font-semibold text-white/80">Registrazioni recenti</p>
            <div className="divide-y divide-surface-border">
              {RECENT_ENTRIES.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{e.task}</p>
                    <p className="text-xs text-white/45">
                      {e.user} · {e.when}
                    </p>
                  </div>
                  <span className="badge bg-brand-500/15 text-brand-300">{e.duration}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="mb-3 text-sm font-semibold text-white/80">Ore per persona (30gg)</p>
            <div className="space-y-3">
              {mockTimeByUser.map((u) => (
                <div key={u.name}>
                  <div className="flex justify-between text-xs text-white/55">
                    <span>{u.name}</span>
                    <span>{u.hours}h</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, (u.hours / 70) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
