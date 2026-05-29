"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "crm_cookie_consent_v1";

/** Banner informativo cookie/storage tecnici (GDPR + linee Garante). */
export function CookieBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAppRoute =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/clients") ||
      pathname.startsWith("/quotes") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/portal") ||
      pathname.startsWith("/login");
    if (isAppRoute) return;
    if (localStorage.getItem(STORAGE_KEY) === "accepted") return;
    setVisible(true);
  }, [pathname]);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Informativa cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:p-5"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Utilizziamo cookie e storage locale tecnici per login, sicurezza e
          funzionamento del sito. Non usiamo cookie di profilazione.{" "}
          <Link href="/cookie-policy" className="text-primary hover:underline">
            Cookie policy
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy
          </Link>
        </p>
        <Button size="sm" className="shrink-0" onClick={accept}>
          Ho capito
        </Button>
      </div>
    </div>
  );
}
