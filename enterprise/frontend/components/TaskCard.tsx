export interface BoardTask {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  assignee: { firstName: string; lastName: string; avatarColor: string } | null;
  checklistItems: { id: string; label: string; done: boolean }[];
  subtasks: unknown[];
}

const PRIORITY_STYLE: Record<BoardTask["priority"], string> = {
  LOW: "bg-white/10 text-white/60",
  MEDIUM: "bg-accent-cyan/15 text-accent-cyan",
  HIGH: "bg-accent-amber/15 text-accent-amber",
  URGENT: "bg-accent-rose/15 text-accent-rose",
};

const PRIORITY_LABEL: Record<BoardTask["priority"], string> = {
  LOW: "Bassa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export function TaskCard({ task }: { task: BoardTask }) {
  const doneItems = task.checklistItems.filter((c) => c.done).length;

  return (
    <div className="cursor-grab rounded-xl border border-surface-border bg-surface-card p-3 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-brand-500/40">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <span className={`badge shrink-0 ${PRIORITY_STYLE[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/45">
          {task.checklistItems.length > 0 && (
            <span>
              ✓ {doneItems}/{task.checklistItems.length}
            </span>
          )}
          {task.subtasks.length > 0 && <span>⌵ {task.subtasks.length} sottotask</span>}
        </div>
        {task.assignee ? (
          <div
            className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-surface"
            style={{ background: task.assignee.avatarColor }}
            title={`${task.assignee.firstName} ${task.assignee.lastName}`}
          >
            {task.assignee.firstName[0]}
            {task.assignee.lastName[0]}
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full border border-dashed border-white/20" title="Non assegnato" />
        )}
      </div>
    </div>
  );
}
