"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { navRuleForHref } from "@/lib/nav-permissions";

function permissionKey(resource: string, action: string) {
  return `${resource}:${action.toLowerCase()}`;
}

function hasKey(keys: Set<string>, resource: string, action: string): boolean {
  const key = permissionKey(resource, action);
  if (keys.has(key)) return true;
  if (keys.has(`${resource}:*`)) return true;
  return false;
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const isClient = user?.role === "CLIENT";
  const isAdmin =
    user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["permissions", "mine", user?.role],
    queryFn: permissionsApi.getMine,
    enabled: !!user && !isClient,
    staleTime: 5 * 60 * 1000,
  });

  const keySet = useMemo(() => {
    if (user?.role === "SUPER_ADMIN") return new Set(["*"]);
    return new Set(data?.permissionKeys ?? []);
  }, [user?.role, data?.permissionKeys]);

  const can = useCallback(
    (resource: string, action = "READ") => {
      if (!user) return false;
      if (user.role === "SUPER_ADMIN") return true;
      if (keySet.has("*")) return true;
      return hasKey(keySet, resource, action);
    },
    [user, keySet]
  );

  const canAccessHref = useCallback(
    (href: string) => {
      if (!user) return false;
      if (user.role === "SUPER_ADMIN") return true;
      if (href === "/dashboard") return true;
      if (href === "/activity-logs") return isAdmin;
      const rule = navRuleForHref(href);
      if (!rule) return true;
      return can(rule.resource, rule.action ?? "READ");
    },
    [user, can, isAdmin]
  );

  return {
    user,
    isAdmin,
    isClient,
    can,
    canAccessHref,
    myPermissions: data,
    isLoading: isLoading && !isClient,
  };
}
