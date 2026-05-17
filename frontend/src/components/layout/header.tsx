"use client";

import { useState } from "react";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { notificationsApi } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

export function Header({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        <GlobalSearch className="hidden md:block" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-primary" />
            )}
          </Button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg">
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
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted/50",
                          !n.isRead && "bg-primary/5"
                        )}
                        onClick={() => {
                          if (!n.isRead) markRead.mutate(n.id);
                        }}
                      >
                        <p className="font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
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
          )}
        </div>
      </div>
    </header>
  );
}
