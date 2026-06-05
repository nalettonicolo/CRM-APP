"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Wallet,
  Wrench,
  Package,
  Boxes,
  Briefcase,
  CalendarRange,
  Calendar,
  Printer,
  MapPin,
  Settings,
  LogOut,
  ClipboardList,
  UserCircle,
  UserCog,
  Inbox,
  History,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { authApi, leadsApi, settingsApi } from "@/lib/api";
import { DEFAULT_APP_NAME, publicAssetUrl } from "@/lib/branding";
import { userRoleLabels } from "@/lib/labels";
import { Button } from "@/components/ui/button";

type NavItem = { href: string; label: string; icon: LucideIcon };

type NavGroup = { title?: string; items: NavItem[] };

const staffGroups: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/clients", label: "Clienti", icon: Users },
      { href: "/quotes", label: "Preventivi", icon: FileText },
      { href: "/invoices", label: "Doc. cortesia", icon: Receipt },
      { href: "/payments", label: "Pagamenti", icon: Wallet },
    ],
  },
  {
    title: "Operatività",
    items: [
      { href: "/interventions", label: "Interventi", icon: Wrench },
      { href: "/reports", label: "Verbali", icon: ClipboardList },
      { href: "/site-visits", label: "Sopralluogo", icon: MapPin },
      { href: "/calendar", label: "Calendario", icon: Calendar },
    ],
  },
  {
    title: "Magazzino",
    items: [
      { href: "/inventory", label: "Giacenze", icon: Package },
      { href: "/inventory/products", label: "Prodotti", icon: Boxes },
      { href: "/inventory/rentals", label: "Noleggio", icon: CalendarRange },
      { href: "/inventory/services", label: "Servizi", icon: Briefcase },
      { href: "/inventory/print", label: "Stampa", icon: Printer },
    ],
  },
];

const adminItems: NavItem[] = [
  { href: "/leads", label: "Richieste", icon: Inbox },
  { href: "/activity-logs", label: "Audit", icon: History },
  { href: "/users", label: "Utenti", icon: UserCog },
];

const clientNav: NavItem[] = [
  { href: "/portal", label: "Area cliente", icon: UserCircle },
  { href: "/portal/quotes", label: "Preventivi", icon: FileText },
  { href: "/portal/reports", label: "Report", icon: ClipboardList },
  { href: "/portal/documents", label: "Documenti", icon: Receipt },
  { href: "/portal/events", label: "Appuntamenti", icon: Calendar },
];

function NavLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const showBadge = badge != null && badge > 0;
  return (
    <Link href={item.href} onClick={onNavigate} className="block">
      <span
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
          active
            ? "bg-white/12 text-white shadow-sm ring-1 ring-white/10"
            : "text-white/65 hover:bg-white/8 hover:text-white"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-primary-foreground" : "text-white/50"
          )}
          strokeWidth={active ? 2.25 : 2}
        />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {showBadge && (
          <span
            className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-none text-white"
            aria-label={`${badge} richieste nuove`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
    </Link>
  );
}

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

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    enabled: isAuthenticated,
  });

  const { data: pendingLeads } = useQuery({
    queryKey: ["leads", "pending-count"],
    queryFn: leadsApi.pendingCount,
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 60_000,
  });

  const appName =
    ((settings?.app_name as { name?: string })?.name || DEFAULT_APP_NAME).trim() ||
    DEFAULT_APP_NAME;
  const logoSrc = publicAssetUrl((settings?.logo as { url?: string })?.url);
  const initial = appName.charAt(0).toUpperCase() || "N";

  const groups: NavGroup[] = isClient
    ? [{ items: clientNav }]
    : [
        ...staffGroups,
        ...(isAdmin ? [{ title: "Amministrazione", items: adminItems }] : []),
        {
          items: [
            { href: "/settings", label: "Impostazioni", icon: Settings },
          ],
        },
      ];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    logout();
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-[100dvh] w-[15.5rem] flex-col border-r border-white/5 bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)] shadow-xl transition-transform duration-300 ease-out",
        "lg:z-40 lg:shadow-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-8 w-8 shrink-0 rounded-md border border-white/10 bg-white/5 object-contain p-0.5"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-white">
              {appName}
            </p>
            <p className="truncate text-[10px] text-white/45">Gestionale</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onClose}
          aria-label="Chiudi menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 py-3">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.title && (
              <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                {group.title}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                badge={
                  item.href === "/leads" ? pendingLeads?.count : undefined
                }
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 rounded-md bg-white/5 px-2.5 py-2">
          <p className="truncate text-xs font-medium text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-[10px] text-white/45">
            {user?.role ? userRoleLabels[user.role] || user.role : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Esci
        </button>
      </div>
    </aside>
  );
}
