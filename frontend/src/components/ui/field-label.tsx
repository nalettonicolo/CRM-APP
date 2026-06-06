import { cn } from "@/lib/utils";

export function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-foreground",
        className
      )}
    >
      {children}
    </label>
  );
}

export const appSelectClass =
  "app-select flex h-11 w-full min-h-11 rounded-lg border border-border bg-card px-3 text-base sm:text-sm";
