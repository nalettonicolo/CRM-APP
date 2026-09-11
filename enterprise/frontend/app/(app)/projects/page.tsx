import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { mockProjects } from "@/lib/mockData";

export default function ProjectsPage() {
  return (
    <>
      <Topbar title="Progetti" subtitle="Board Kanban, task e sottotask per commessa" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-white/50">{mockProjects.length} progetti attivi</p>
          <button className="btn-primary text-sm">+ Nuovo progetto</button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card block p-5 transition-colors hover:border-brand-500/50"
            >
              <div className="mb-3 h-1.5 w-10 rounded-full" style={{ background: p.color }} />
              <p className="font-semibold">{p.name}</p>
              <p className="mt-1 text-sm text-white/55 line-clamp-2">{p.description}</p>
              <p className="mt-4 text-xs text-white/40">{p._count.tasks} task</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
