import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageCreateBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap justify-end gap-2", className)}>
      {children}
    </div>
  );
}

export function PageCreateLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button asChild>
      <Link href={href}>
        <Plus className="h-4 w-4" /> {label}
      </Link>
    </Button>
  );
}

export function PageCreateButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      <Plus className="h-4 w-4" /> {label}
    </Button>
  );
}
