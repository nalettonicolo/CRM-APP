"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignaturePadProps = {
  label: string;
  initialDataUrl?: string | null;
  clearLabel?: string;
  className?: string;
  onReady?: (getDataUrl: () => string | undefined) => void;
};

export function SignaturePad({
  label,
  initialDataUrl,
  clearLabel = "Cancella firma",
  className,
  onReady,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  function getDataUrl(): string | undefined {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return canvas.toDataURL("image/png");
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  useEffect(() => {
    onReady?.(getDataUrl);
  }, [onReady]);

  function drawAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (!drawing.current) {
      drawing.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() {
    drawing.current = false;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium">{label}</label>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        className="h-[140px] w-full max-w-full touch-none rounded-xl border border-border bg-white"
        onMouseDown={(e) => drawAt(e.clientX, e.clientY)}
        onMouseMove={(e) => drawing.current && drawAt(e.clientX, e.clientY)}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={(e) => {
          e.preventDefault();
          const t = e.touches[0];
          if (t) drawAt(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const t = e.touches[0];
          if (t) drawAt(t.clientX, t.clientY);
        }}
        onTouchEnd={stopDraw}
      />
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        {clearLabel}
      </Button>
    </div>
  );
}

export function readSignatureFromPad(
  getDataUrl: (() => string | undefined) | undefined
): string | undefined {
  return getDataUrl?.();
}
