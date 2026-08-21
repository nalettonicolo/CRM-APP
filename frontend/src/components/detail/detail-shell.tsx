"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function DetailBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]",
        className
      )}
    >
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-card-foreground sm:px-5">
        {title}
      </h2>
      <div className="p-4 text-card-foreground sm:p-5">{children}</div>
    </section>
  );
}

export function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | React.ReactNode | null;
}) {
  if (value == null) return null;
  if (typeof value === "string" && !value.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm">
        {typeof value === "string" ? value : value}
      </div>
    </div>
  );
}

export function ClickableRow({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer border-b border-border transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
    >
      {children}
    </tr>
  );
}
