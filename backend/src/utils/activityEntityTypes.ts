/** Valori entityType usati in ActivityLog (allowlist per filtri query). */
export const ACTIVITY_ENTITY_TYPES = [
  "client",
  "lead",
  "quote",
  "intervention",
  "report",
  "invoice",
  "payment",
  "event",
  "site_visit",
  "user",
  "product",
  "service",
  "warehouse",
  "inventory",
  "attachment",
  "backup",
  "role_permissions",
  "quote_automation_rule",
] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];
