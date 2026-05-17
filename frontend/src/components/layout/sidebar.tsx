"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Wrench,
  Package,
  Boxes,
  Briefcase,
  Calendar,
  Settings,
  LogOut,
  ClipboardList,
  UserCircle,
  UserCog,
  Inbox,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { authApi, settingsApi } from "@/lib/api";
import { DEFAULT_APP_NAME, publicAssetUrl } from "@/lib/branding";
import { userRoleLabels } from "@/lib/labels";
import { Button } from "@/components/ui/button";

const staffNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clienti", icon: Users },
  { href: "/quotes", label: "Preventivi", icon: FileText },
  { href: "/invoices", label: "Fatture", icon: Receipt },
  { href: "/interventions", label: "Interventi", icon: Wrench },
  { href: "/reports", label: "Report", icon: ClipboardList },
  { href: "/inventory", label: "Magazzino", icon: Package },
  { href: "/inventory/products", label: "Prodotti", icon: Boxes },
  { href: "/inventory/services", label: "Catalogo servizi", icon: Briefcase },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

const clientNav = [
  { href: "/portal", label: "Area Cliente", icon: UserCircle },
  { href: "/portal/quotes", label: "Preventivi", icon: FileText },
  { href: "/portal/reports", label: "Report", icon: ClipboardList },
  { href: "/portal/documents", label: "Documenti", icon: Receipt },
  { href: "/portal/events", label: "Appuntamenti", icon: Calendar },
];

export function Sidebar({
  mobileOpen,
  onNavigate,
  onClose,
}: {
  mobileOpen: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const nav = isClient
    ? clientNav
    : [
        ...staffNav,
        ...(isAdmin
          ? [
              { href: "/leads", label: "Richieste", icon: Inbox },
              { href: "/activity-logs", label: "Audit log", icon: History },
              { href: "/users", label: "Utenti", icon: UserCog },
            ]
          : []),
      ];

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    enabled: isAuthenticated,
  });

  const appName =
    ((settings?.app_name as { name?: string })?.name || DEFAULT_APP_NAME).trim() ||
    DEFAULT_APP_NAME;
  const logoSrc = publicAssetUrl((settings?.logo as { url?: string })?.url);
  const initial = appName.charAt(0).toUpperCase() || "N";

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    logout();
    window.location.href = "/login";
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(100vw-3rem,18rem)] max-w-72 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)] shadow-xl transition-transform duration-300 ease-out",
        "lg:z-40 lg:w-64 lg:max-w-none lg:shadow-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 lg:h-16 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain p-0.5"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{appName}</p>
            <p className="truncate text-xs text-white/50">Audio · luci · eventi</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onClose}
          aria-label="Chiudi menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3 lg:p-4">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors lg:py-2.5",
                  active
                    ? "bg-primary/20 text-white"
                    : "text-white/70 active:bg-white/15 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0 lg:h-4 lg:w-4" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4">
        <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
          <p className="truncate text-sm font-medium text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-white/50">
            {user?.role ? userRoleLabels[user.role] || user.role : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/70 active:bg-white/10 hover:bg-white/10 hover:text-white lg:py-2"
        >
          <LogOut className="h-5 w-5 lg:h-4 lg:w-4" />
          Esci
        </button>
      </div>
    </aside>
  );
}
