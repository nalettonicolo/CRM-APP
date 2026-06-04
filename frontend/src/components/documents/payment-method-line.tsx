import type { PaymentLineSegment } from "@/lib/labels";

export function PaymentMethodLine({
  segments,
  className,
}: {
  segments: PaymentLineSegment[];
  className?: string;
}) {
  if (!segments.length) return null;
  return (
    <span className={className}>
      {segments.map((seg, index) => (
        <span key={index} className={seg.bold ? "font-semibold" : undefined}>
          {seg.text}
        </span>
      ))}
    </span>
  );
}
