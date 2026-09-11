import { prisma } from "./prisma.js";
import type { Task } from "@prisma/client";

/**
 * Motore automazioni enterprise ("se succede X allora fai Y").
 * v1: valuta le regole attive per un triggerType e applica azioni semplici
 * (assegna utente, sposta colonna, crea notifica). Pensato per essere esteso
 * con nuovi triggerType/actionType senza toccare le route chiamanti.
 */
export async function runAutomationsForTrigger(
  organizationId: string,
  triggerType: string,
  task: Task,
) {
  const rules = await prisma.automationRule.findMany({
    where: { organizationId, triggerType, isActive: true },
  });

  for (const rule of rules) {
    try {
      const config = rule.triggerConfig as Record<string, unknown>;
      if (triggerType === "task.status_changed" && config.status && config.status !== task.status) {
        continue; // la regola è condizionata a uno status specifico, non corrisponde
      }

      const action = rule.actionConfig as Record<string, unknown>;
      switch (rule.actionType) {
        case "task.assign":
          if (typeof action.userId === "string") {
            await prisma.task.update({ where: { id: task.id }, data: { assigneeId: action.userId } });
          }
          break;
        case "task.move_column":
          if (typeof action.columnId === "string") {
            await prisma.task.update({ where: { id: task.id }, data: { columnId: action.columnId } });
          }
          break;
        case "notification.send":
          if (typeof action.userId === "string") {
            await prisma.notification.create({
              data: {
                userId: action.userId,
                title: typeof action.title === "string" ? action.title : "Automazione eseguita",
                body: `Regola "${rule.name}" applicata al task "${task.title}"`,
                link: `/projects/${task.projectId}`,
              },
            });
          }
          break;
      }

      await prisma.automationRunLog.create({
        data: { ruleId: rule.id, taskId: task.id, success: true },
      });
    } catch (err) {
      await prisma.automationRunLog.create({
        data: {
          ruleId: rule.id,
          taskId: task.id,
          success: false,
          message: err instanceof Error ? err.message : "errore sconosciuto",
        },
      });
    }
  }
}
