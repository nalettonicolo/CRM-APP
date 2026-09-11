import { Topbar } from "@/components/Topbar";
import { mockDocs } from "@/lib/mockData";

export default function DocsPage() {
  return (
    <>
      <Topbar title="Docs & Wiki" subtitle="Documentazione collaborativa aziendale" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-white/50">{mockDocs.length} documenti</p>
          <button className="btn-primary text-sm">+ Nuovo documento</button>
        </div>
        <div className="card divide-y divide-surface-border">
          {mockDocs.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-white/45">
                    {d.author.firstName} {d.author.lastName} · aggiornato {new Date(d.updatedAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
              </div>
              <button className="text-sm text-brand-300 hover:underline">Apri →</button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
