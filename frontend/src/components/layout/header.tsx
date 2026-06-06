"use client";

import { useState } from "react";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { MobileSearchDialog } from "@/components/layout/mobile-search-dialog";
import { useShell } from "@/components/layout/shell-context";
import { notificationsApi } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

export function Header({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const { toggleMobileMenu } = useShell();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <header className="app-safe-top sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/95 px-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:gap-3 sm:px-4 lg:h-16 lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={toggleMobileMenu}
          aria-label="Apri menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg lg:text-xl">
          {title}
        </h1>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Cerca"
          >
            <Search className="h-4 w-4" />
          </Button>
          <GlobalSearch className="hidden md:block" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Cambia tema"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label={
                unread > 0
                  ? `Notifiche, ${unread} non lette`
                  : "Notifiche"
              }
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
            {notifOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Chiudi notifiche"
                  onClick={() => setNotifOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 max-h-[min(24rem,70dvh)] w-[min(calc(100vw-1.5rem),20rem)] overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg sm:w-80">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      Nessuna notifica
                    </p>
                  ) : (
                    <ul>
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={cn(
                              "min-h-11 w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50",
                              !n.isRead && "bg-primary/5"
                            )}
                            onClick={() => {
                              if (!n.isRead) markRead.mutate(n.id);
                            }}
                          >
                            <p className="font-medium">{n.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {formatDate(n.createdAt)}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
