import type { UserRole, PermissionAction } from "@prisma/client";

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: [
    "users:*",
    "clients:*",
    "quotes:*",
    "reports:*",
    "inventory:*",
    "settings:*",
    "events:*",
    "products:*",
    "services:*",
    "leads:*",
    "attachments:*",
    "interventions:*",
    "invoices:*",
    "payments:*",
    "automation:*",
    "backup:*",
    "search:*",
  ],
  COMMERCIAL: [
    "clients:read",
    "clients:create",
    "clients:update",
    "quotes:*",
    "leads:*",
    "attachments:*",
    "events:read",
    "events:create",
    "events:update",
    "products:*",
    "services:*",
    "invoices:read",
    "invoices:create",
    "payments:read",
    "payments:create",
    "payments:update",
    "search:read",
  ],
  TECHNICIAN: [
    "clients:read",
    "interventions:read",
    "interventions:update",
    "reports:*",
    "events:read",
    "events:update",
    "inventory:read",
    "products:read",
    "attachments:read",
    "attachments:create",
    "search:read",
  ],
  OPERATOR: [
    "clients:read",
    "quotes:read",
    "reports:read",
    "events:read",
    "inventory:read",
    "search:read",
  ],
  WAREHOUSE: [
    "inventory:*",
    "products:*",
    "services:*",
    "reports:read",
    "search:read",
  ],
  CLIENT: [
    "portal:read",
    "quotes:read",
    "reports:read",
    "invoices:read",
    "events:read",
    "attachments:read",
    "attachments:create",
  ],
};

export function hasPermission(
  role: UserRole,
  resource: string,
  action: PermissionAction | string
): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes("*")) return true;

  const key = `${resource}:${String(action).toLowerCase()}`;
  const wildcard = `${resource}:*`;

  return perms.includes(key) || perms.includes(wildcard);
}

export function canAccessOwnOnly(role: UserRole): boolean {
  return role === "TECHNICIAN" || role === "CLIENT";
}
