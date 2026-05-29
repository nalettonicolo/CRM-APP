import Link from "next/link";
import { cn } from "@/lib/utils";

export function LegalFooterLinks({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  const linkClass = cn(
    "underline-offset-4 hover:underline",
    linkClassName ?? "text-primary"
  );

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1", className)}
      aria-label="Documenti legali"
    >
      <Link href="/privacy" className={linkClass}>
        Privacy
      </Link>
      <Link href="/cookie-policy" className={linkClass}>
        Cookie
      </Link>
      <Link href="/termini" className={linkClass}>
        Termini d&apos;uso
      </Link>
    </nav>
  );
}
