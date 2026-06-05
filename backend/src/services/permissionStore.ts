import type { PermissionAction, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  ALL_CATALOG_ENTRIES,
  permissionKey,
} from "../constants/permissionCatalog.js";

/** Permessi predefiniti per ruolo (usati solo al primo avvio o con seed). */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
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
    "clients:delete",
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

const EDITABLE_ROLES: UserRole[] = [
  "ADMIN",
  "COMMERCIAL",
  "TECHNICIAN",
  "OPERATOR",
  "WAREHOUSE",
  "CLIENT",
];

let rolePermissionCache = new Map<UserRole, Set<string>>();

function expandPatterns(patterns: string[]): Set<string> {
  const allKeys = new Set(
    ALL_CATALOG_ENTRIES.map((e) => permissionKey(e.resource, e.action))
  );
  const result = new Set<string>();

  for (const pattern of patterns) {
    if (pattern === "*") {
      for (const key of allKeys) result.add(key);
      continue;
    }
    const [resource, action] = pattern.split(":");
    if (action === "*") {
      for (const key of allKeys) {
        if (key.startsWith(`${resource}:`)) result.add(key);
      }
      continue;
    }
    result.add(permissionKey(resource, action));
  }

  return result;
}

export async function ensurePermissionCatalog(): Promise<void> {
  for (const entry of ALL_CATALOG_ENTRIES) {
    await prisma.permission.upsert({
      where: {
        resource_action: { resource: entry.resource, action: entry.action },
      },
      create: {
        resource: entry.resource,
        action: entry.action,
        name: entry.name,
        description: `${entry.resourceLabel}: ${entry.actionLabel}`,
      },
      update: {
        name: entry.name,
        description: `${entry.resourceLabel}: ${entry.actionLabel}`,
      },
    });
  }
}

export async function ensureDefaultRolePermissions(): Promise<void> {
  const permissions = await prisma.permission.findMany();
  const byKey = new Map(
    permissions.map((p) => [permissionKey(p.resource, p.action), p.id])
  );

  for (const slug of EDITABLE_ROLES) {
    const role = await prisma.role.findUnique({
      where: { slug },
      include: { _count: { select: { permissions: true } } },
    });
    if (!role || role._count.permissions > 0) continue;

    const keys = expandPatterns(DEFAULT_ROLE_PERMISSIONS[slug] || []);
    const permissionIds = [...keys]
      .map((key) => byKey.get(key))
      .filter((id): id is string => !!id);

    if (permissionIds.length === 0) continue;

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }
}

export async function reloadPermissionCache(): Promise<void> {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  const next = new Map<UserRole, Set<string>>();
  for (const role of roles) {
    const set = new Set<string>();
    for (const rp of role.permissions) {
      set.add(
        permissionKey(rp.permission.resource, rp.permission.action)
      );
    }
    next.set(role.slug, set);
  }
  rolePermissionCache = next;
}

export async function initPermissionStore(): Promise<void> {
  await ensurePermissionCatalog();
  await ensureDefaultRolePermissions();
  await reloadPermissionCache();
}

function checkPermissionSet(
  perms: Set<string>,
  resource: string,
  action: string
): boolean {
  const key = permissionKey(resource, action);
  const wildcard = `${resource}:*`;
  return perms.has(key) || perms.has(wildcard);
}

export function hasPermission(
  role: UserRole,
  resource: string,
  action: PermissionAction | string
): boolean {
  if (role === "SUPER_ADMIN") return true;

  const cached = rolePermissionCache.get(role);
  if (cached && cached.size > 0) {
    return checkPermissionSet(cached, resource, String(action));
  }

  const fallback = expandPatterns(DEFAULT_ROLE_PERMISSIONS[role] || []);
  return checkPermissionSet(fallback, resource, String(action));
}

export async function getPermissionMatrix() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: {
        permissions: { select: { permissionId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: [{ resource: "asc" }, { action: "asc" }] }),
  ]);

  return {
    roles: roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      editable: role.slug !== "SUPER_ADMIN",
      permissionIds: role.permissions.map((p) => p.permissionId),
    })),
    permissions: permissions.map((p) => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      name: p.name,
      key: permissionKey(p.resource, p.action),
    })),
  };
}

export function canAccessOwnOnly(role: UserRole): boolean {
  return role === "TECHNICIAN" || role === "CLIENT";
}

export async function updateRolePermissions(
  slug: UserRole,
  permissionIds: string[]
): Promise<void> {
  if (slug === "SUPER_ADMIN") {
    throw new Error("I permessi del Super Admin non sono modificabili");
  }

  const role = await prisma.role.findUnique({ where: { slug } });
  if (!role) throw new Error("Ruolo non trovato");

  const validPermissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });
  const validIds = new Set(validPermissions.map((p) => p.id));

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({
      data: [...validIds].map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    }),
  ]);

  await reloadPermissionCache();
}
