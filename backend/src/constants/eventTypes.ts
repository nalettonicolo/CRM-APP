/** Valori enum EventType (Prisma). */
export const EVENT_TYPE_VALUES = [
  "APPOINTMENT",
  "INTERVENTION",
  "DEADLINE",
  "REMINDER",
  "MEETING",
  "SITE_VISIT",
  "EVENT",
  "RENTAL",
  "OTHER",
] as const;

export type EventTypeValue = (typeof EVENT_TYPE_VALUES)[number];
