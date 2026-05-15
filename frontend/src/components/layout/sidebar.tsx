"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  Package,
  Calendar,
  Settings,
  LogOut,
  ClipboardList,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";

const staffNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clienti", icon: Users },
  { href: "/quotes", label: "Preventivi", icon: FileText },
  { href: "/interventions", label: "Interventi", icon: Wrench },
  { href: "/reports", label: "Report", icon: ClipboardList },
  { href: "/inventory", label: "Magazzino", icon: Package },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

const clientNav = [
  { href: "/portal", label: "Area Cliente", icon: UserCircle },
  { href: "/portal/quotes", label: "Preventivi", icon: FileText },
  { href: "/portal/reports", label: "Report", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isClient = user?.role === "CLIENT";
  const nav = isClient ? clientNav : staffNav;

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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)]">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white"
        >
          N
        </motion.div>
        <div>
          <p className="font-semibold text-white">NexusCRM</p>
          <p className="text-xs text-white/50">Gestionale SaaS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <motion.span
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
          <p className="text-sm font-medium text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-white/50">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Esci
        </button>
      </div>
    </aside>
  );
}
