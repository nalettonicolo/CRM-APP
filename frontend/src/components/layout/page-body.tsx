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
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[1600px] p-3 sm:p-4 md:p-6 lg:p-8",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </div>
  );
}
