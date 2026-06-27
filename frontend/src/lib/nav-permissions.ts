/** Permesso minimo per mostrare una voce di menu (azione READ salvo indicato). */
export type NavPermissionRule = {
  resource: string;
  action?: string;
};

export const NAV_PERMISSION_RULES: Record<string, NavPermissionRule> = {
  "/clients": { resource: "clients" },
  "/quotes": { resource: "quotes" },
  "/invoices": { resource: "invoices" },
  "/payments": { resource: "payments" },
  "/interventions": { resource: "interventions" },
  "/reports": { resource: "reports" },
  "/site-visits": { resource: "events" },
  "/calendar": { resource: "events" },
  "/inventory": { resource: "inventory" },
  "/inventory/products": { resource: "products" },
  "/inventory/rentals": { resource: "products" },
  "/inventory/services": { resource: "services" },
  "/inventory/print": { resource: "products" },
  "/leads": { resource: "leads" },
  "/users": { resource: "users", action: "MANAGE_USERS" },
  "/settings/permissions": { resource: "users", action: "MANAGE_USERS" },
  "/settings": { resource: "settings" },
};

export function navRuleForHref(href: string): NavPermissionRule | null {
  if (href === "/dashboard" || href === "/activity-logs") return null;
  if (NAV_PERMISSION_RULES[href]) return NAV_PERMISSION_RULES[href];
  const match = Object.keys(NAV_PERMISSION_RULES)
    .filter((key) => href.startsWith(key + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? NAV_PERMISSION_RULES[match] : null;
}
