import { Topbar } from "@/components/Topbar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { mockBoard } from "@/lib/mockData";

// v1: mostra sempre la board demo indipendentemente dall'id — quando l'API
// è collegata, sostituire con un fetch server-side su /projects/:id.
export default function ProjectBoardPage() {
  return (
    <>
      <Topbar title={mockBoard.name} subtitle={mockBoard.description} />
      <main className="flex-1 overflow-y-auto p-6">
        <KanbanBoard columns={mockBoard.columns} />
      </main>
    </>
  );
}
