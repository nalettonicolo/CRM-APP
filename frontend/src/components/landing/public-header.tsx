"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/branding/brand-logo";
import { cn } from "@/lib/utils";

export function PublicHeader({
  appName,
  logoSrc,
}: {
  appName: string;
  logoSrc: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <BrandLogo logoUrl={logoSrc || undefined} appName={appName} variant="nav" />
          <span className="truncate text-base font-semibold text-white sm:text-lg">
            {appName}
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Area riservata
            </Button>
          </Link>
          <Link href="#contatto">
            <Button size="sm" className="shadow-lg shadow-primary/25">
              Richiedi preventivo <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white md:hidden"
          aria-expanded={open}
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <MobileMenu open={open} setOpen={setOpen} />
    </header>
  );
}

function MobileMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "border-t border-white/10 bg-slate-950/95 px-4 py-4 md:hidden",
        open ? "block" : "hidden"
      )}
    >
      <div className="flex flex-col gap-3">
        <Link href="/login" onClick={() => setOpen(false)}>
          <Button
            variant="outline"
            className="h-12 w-full border-white/20 bg-transparent text-white"
          >
            Area riservata
          </Button>
        </Link>
      </div>
    </div>
  );
}
