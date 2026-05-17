import { cn } from "@/lib/utils";

/** Padding responsive per le pagine interne (mobile-first). */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-3 sm:p-4 md:p-6", className)}>{children}</div>
  );
}
