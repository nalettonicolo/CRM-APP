import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Card lista con scroll orizzontale touch-friendly su mobile. */
export function DataCard({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardContent className={cn("p-0", contentClassName)}>
        <div className="app-table-wrap">{children}</div>
      </CardContent>
    </Card>
  );
}
