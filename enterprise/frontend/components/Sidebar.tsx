"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/projects", label: "Progetti", icon: "🗂️" },
  { href: "/configurator", label: "Configuratore 3D", icon: "🧊" },
  { href: "/time-tracking", label: "Time Tracking", icon: "⏱️" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/docs", label: "Docs & Wiki", icon: "📄" },
  { href: "/whiteboard", label: "Whiteboard", icon: "🧩" },
  { href: "/automations", label: "Automazioni", icon: "⚡" },
  { href: "/reports", label: "Reportistica", icon: "📈" },
  { href: "/team", label: "Team & Ruoli", icon: "🔐" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-border bg-surface-raised px-3 py-4 md:flex">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-surface">
          NS
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Nicolò Service</p>
          <p className="text-xs text-white/50">Enterprise</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand-500/15 text-brand-300"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-surface-border bg-white/5 p-3 text-xs text-white/50">
        Foundation enterprise — moduli in evoluzione. Vedi README per la roadmap.
      </div>
    </aside>
  );
}
