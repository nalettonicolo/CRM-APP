"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPrice, parsePrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type PriceInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: number;
  onValueChange: (value: number) => void;
};

export function PriceInput({
  value,
  onValueChange,
  className,
  onBlur,
  onFocus,
  ...props
}: PriceInputProps) {
  const [text, setText] = useState(() => formatPrice(value));

  useEffect(() => {
    setText(formatPrice(value));
  }, [value]);

  return (
    <Input
      {...props}
      inputMode="decimal"
      className={cn("text-right tabular-nums", className)}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        onFocus?.(e);
        e.target.select();
      }}
      onBlur={(e) => {
        const parsed = parsePrice(text);
        onValueChange(parsed);
        setText(formatPrice(parsed));
        onBlur?.(e);
      }}
    />
  );
}
