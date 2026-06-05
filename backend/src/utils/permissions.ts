import type { UserRole, PermissionAction } from "@prisma/client";
import {
  hasPermission as checkPermission,
  canAccessOwnOnly as ownOnly,
} from "../services/permissionStore.js";

export { DEFAULT_ROLE_PERMISSIONS } from "../services/permissionStore.js";

export function hasPermission(
  role: UserRole,
  resource: string,
  action: PermissionAction | string
): boolean {
  return checkPermission(role, resource, action);
}

export function canAccessOwnOnly(role: UserRole): boolean {
  return ownOnly(role);
}
