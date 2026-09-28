"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { LoadingState, EmptyState } from "@/components/StateViews";
import { withFallback } from "@/lib/api";
import { mockProjects } from "@/lib/mockData";

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  color: string;
  _count: { tasks: number };
}

// Pagina di riferimento per il pattern loading/empty/error + fallback API:
// prova /api/projects, e se il backend non risponde ricade sui dati demo
// (vedi lib/api.ts withFallback). Le altre liste possono replicare questo
// stesso schema quando vengono collegate all'API reale.
export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    withFallback<ProjectSummary[]>("/projects", mockProjects).then((data) => {
      if (active) setProjects(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Topbar title="Progetti" subtitle="Board Kanban, task e sottotask per commessa" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-white/50">
            {projects ? `${projects.length} progetti attivi` : "Progetti"}
          </p>
          <button className="btn-primary text-sm">+ Nuovo progetto</button>
        </div>

        {projects === null && <LoadingState label="Caricamento progetti…" />}

        {projects !== null && projects.length === 0 && (
          <EmptyState title="Nessun progetto" description="Crea il primo progetto per iniziare a pianificare i task." />
        )}

        {projects !== null && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
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
        )}
      </main>
    </>
  );
}
