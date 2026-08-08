import { prismaCrm } from "../lib/prisma.js";

export type ScheduleConflict = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  type: string;
};

/** Intervalli [start, end) si sovrappongono. */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Conflitti sul calendario condiviso (sempre DB CRM). */
export async function findScheduleConflicts(options: {
  startAt: Date;
  endAt?: Date | null;
  excludeEventId?: string;
}): Promise<ScheduleConflict[]> {
  const start = options.startAt;
  const end =
    options.endAt && options.endAt > start
      ? options.endAt
      : new Date(start.getTime() + 60 * 60 * 1000);

  const candidates = await prismaCrm.event.findMany({
    where: {
      ...(options.excludeEventId
        ? { id: { not: options.excludeEventId } }
        : {}),
      startAt: { lt: end },
      OR: [{ endAt: null }, { endAt: { gt: start } }],
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      type: true,
    },
    orderBy: { startAt: "asc" },
    take: 50,
  });

  return candidates.filter((ev) => {
    const evEnd =
      ev.endAt && ev.endAt > ev.startAt
        ? ev.endAt
        : new Date(ev.startAt.getTime() + 60 * 60 * 1000);
    return rangesOverlap(start, end, ev.startAt, evEnd);
  });
}
