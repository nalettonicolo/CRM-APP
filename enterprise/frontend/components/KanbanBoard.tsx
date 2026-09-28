import { TaskCard, type BoardTask } from "./TaskCard";
import { EmptyState } from "./StateViews";

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  isDoneColumn: boolean;
  tasks: BoardTask[];
}

// Board Kanban di sola visualizzazione per la v1 "solo visivo": lo shape dati
// (colonne → task) è già quello che l'API /projects/:id restituisce, quindi
// aggiungere drag&drop reale (onDrop → POST /tasks/:id/move) è un passo
// isolato senza toccare il resto della UI. Vedi README "Roadmap".
export function KanbanBoard({ columns }: { columns: BoardColumn[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div key={col.id} className="flex w-72 shrink-0 flex-col rounded-xl bg-surface-raised/60 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${col.isDoneColumn ? "bg-accent-green" : "bg-brand-500"}`}
              />
              <p className="text-sm font-semibold">{col.name}</p>
            </div>
            <span className="text-xs text-white/40">{col.tasks.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {col.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {col.tasks.length === 0 && <EmptyState title="Nessun task" />}
          </div>
        </div>
      ))}
    </div>
  );
}
