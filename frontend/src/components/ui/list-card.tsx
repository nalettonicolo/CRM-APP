import { cn } from "@/lib/utils";

/** Riga lista mobile (alternativa alle tabelle su schermi piccoli). */
export function ListCard({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors",
        onClick && "hover:bg-muted/30 active:bg-muted/50",
        className
      )}
    >
      {children}
    </Comp>
  );
}
