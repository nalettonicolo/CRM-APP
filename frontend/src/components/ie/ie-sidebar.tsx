"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  LogOut,
  NotebookPen,
  Package,
  Printer,
  Receipt,
  CalendarClock,
  Truck,
  Users,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";
import { IE_APP_NAME, IE_TAGLINE } from "@/lib/ie-branding";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { hrefKey: "calendar" as const, label: "Calendario", icon: Calendar },
  { hrefKey: "clients" as const, label: "Clienti", icon: Users },
  { hrefKey: "jobOrders" as const, label: "Commesse", icon: ClipboardList },
  { hrefKey: "dailyReports" as const, label: "Report giornalieri", icon: NotebookPen },
  { hrefKey: "deadlines" as const, label: "Scadenze", icon: CalendarClock },
  { hrefKey: "inventory" as const, label: "Magazzino", icon: Package },
  { hrefKey: "products" as const, label: "Catalogo prodotti", icon: Boxes },
  { hrefKey: "services" as const, label: "Catalogo servizi", icon: Briefcase },
  { hrefKey: "supplierCatalogs" as const, label: "Fornitori / listini", icon: Truck },
  { hrefKey: "quotes" as const, label: "Preventivi", icon: FileText },
  { hrefKey: "invoices" as const, label: "Doc. cortesia", icon: Receipt },
  { hrefKey: "print" as const, label: "Documenti e stampa", icon: Printer },
];

export function IeSidebar({
  mobileOpen,
  onNavigate,
  onClose,
}: {
  mobileOpen: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const routes = useWorkspaceRoutes();
  const { user, logout } = useAuthStore();

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
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-[100dvh] w-[15.5rem] flex-col border-r border-sky-900/40 bg-[#0c1929] text-slate-200 shadow-xl transition-transform duration-300 ease-out",
        "lg:z-40 lg:shadow-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-sky-900/40 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {IE_APP_NAME}
            </p>
            <p className="truncate text-[10px] text-slate-400">{IE_TAGLINE}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onClose}
          aria-label="Chiudi menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
        <Link
          href={routes.home}
          onClick={onNavigate}
          className={cn(
            "mb-2 flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
            pathname === routes.home
              ? "bg-sky-600/20 text-sky-100 ring-1 ring-sky-500/30"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <Zap className="h-4 w-4 shrink-0" />
          Panoramica
        </Link>

        {navItems.map((item) => {
          const href = routes[item.hrefKey];
          const Icon = item.icon;
          const active = isActive(href);
          return (
            <Link
              key={item.hrefKey}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sky-600/20 text-sky-100 ring-1 ring-sky-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sky-900/40 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/seleziona-area"
          className="mb-2 flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 rotate-180" />
          Cambia area
        </Link>
        <Link
          href={routes.crmHome}
          className="mb-2 flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna a Nicolò Service
        </Link>
        <div className="mb-2 rounded-md bg-white/5 px-2.5 py-2">
          <p className="truncate text-xs font-medium text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-[10px] text-slate-500">Area interna admin</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Esci
        </button>
      </div>
    </aside>
  );
}
