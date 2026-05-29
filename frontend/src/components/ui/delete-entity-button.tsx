"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteEntityButton({
  onConfirm,
  pending = false,
  label = "Elimina",
  confirmMessage,
  size = "sm",
  className,
  disabled,
}: {
  onConfirm: () => void;
  pending?: boolean;
  confirmMessage: string;
  label?: string;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(
        "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
        className
      )}
      disabled={pending || disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!window.confirm(confirmMessage)) return;
        onConfirm();
      }}
    >
      <Trash2 className="h-4 w-4" />
      {size !== "icon" && (pending ? "Elimino..." : label)}
    </Button>
  );
}
