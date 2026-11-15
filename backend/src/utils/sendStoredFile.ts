import path from "path";
import type { Response } from "express";

// Solo questi tipi si aprono nel browser; il resto viene sempre scaricato
// (un HTML/SVG caricato non deve mai eseguire script).
const inlineTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export function sendStoredFile(
  res: Response,
  filePath: string,
  downloadName: string
): void {
  const inlineType = inlineTypes[path.extname(filePath).toLowerCase()];
  res.setHeader("Content-Type", inlineType ?? "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `${inlineType ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(downloadName)}`
  );
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(path.resolve(filePath));
}
