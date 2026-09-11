import { Topbar } from "@/components/Topbar";

const TOOLS = ["🖊️", "▭", "◯", "→", "📝", "🖼️", "🗑️"];

// v1 "solo visivo": canvas statico di esempio. Il modello dati (Whiteboard.
// elementsJson) è già pronto lato backend per salvare shape reali quando si
// aggiungerà l'editor interattivo (es. libreria canvas + WebSocket per il
// realtime collaborativo — vedi README "Roadmap").
export default function WhiteboardPage() {
  return (
    <>
      <Topbar title="Whiteboard" subtitle="Lavagna visuale condivisa per brainstorming e pianificazione" />
      <main className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-2">
          {TOOLS.map((t) => (
            <button key={t} className="grid h-9 w-9 place-items-center rounded-lg border border-surface-border bg-surface-card text-sm hover:border-brand-500/50">
              {t}
            </button>
          ))}
          <span className="ml-auto text-xs text-white/40">Esempio statico — editor interattivo in roadmap</span>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-xl border border-surface-border bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:22px_22px]">
          <svg viewBox="0 0 800 500" className="h-full w-full">
            <rect x="60" y="60" width="180" height="90" rx="12" fill="#7C5CFC22" stroke="#7C5CFC" strokeWidth="2" />
            <text x="150" y="110" textAnchor="middle" fill="#E4DBFF" fontSize="14">Fase progettazione</text>

            <rect x="330" y="60" width="180" height="90" rx="12" fill="#3ED9D922" stroke="#3ED9D9" strokeWidth="2" />
            <text x="420" y="110" textAnchor="middle" fill="#CFFAFA" fontSize="14">Approvvigionamento</text>

            <rect x="600" y="60" width="150" height="90" rx="12" fill="#F5A52422" stroke="#F5A524" strokeWidth="2" />
            <text x="675" y="110" textAnchor="middle" fill="#FDE6BC" fontSize="14">Installazione</text>

            <line x1="240" y1="105" x2="330" y2="105" stroke="#8B8DBE" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="510" y1="105" x2="600" y2="105" stroke="#8B8DBE" strokeWidth="2" markerEnd="url(#arrow)" />

            <rect x="150" y="260" width="220" height="110" rx="12" fill="#22C55E22" stroke="#22C55E" strokeWidth="2" />
            <text x="260" y="310" textAnchor="middle" fill="#CFFAE0" fontSize="14">Note collaudo</text>
            <text x="260" y="332" textAnchor="middle" fill="#8FE0AA" fontSize="12">Verificare messa a terra</text>

            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#8B8DBE" />
              </marker>
            </defs>
          </svg>
        </div>
      </main>
    </>
  );
}
