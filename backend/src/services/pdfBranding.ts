import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma.js";

type PdfDoc = InstanceType<typeof PDFDocument>;
import { config } from "../config/index.js";

export type CompanyInfo = {
  name?: string;
  vat?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
};

export async function loadCompanySettings(): Promise<CompanyInfo> {
  const row = await prisma.setting.findUnique({ where: { key: "company" } });
  return (row?.value || {}) as CompanyInfo;
}

export async function loadLogoFilePath(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: "logo" } });
  const url = (row?.value as { url?: string })?.url;
  if (!url || !url.startsWith("/uploads/")) return null;
  const rel = url.replace(/^\/uploads\//, "");
  const full = path.join(config.upload.dir, rel);
  return fs.existsSync(full) ? full : null;
}

/** Intestazione PDF: logo (se presente) + dati azienda; opzionale titolo a destra. */
export function drawPdfLetterhead(
  doc: PdfDoc,
  company: CompanyInfo,
  logoPath: string | null,
  options?: { titleRight?: string; subtitleRight?: string[] }
): void {
  const margin = 50;
  const top = 50;
  const logoSize = 72;
  let textX = margin;

  if (logoPath) {
    try {
      doc.image(logoPath, margin, top, { fit: [logoSize, logoSize] });
      textX = margin + logoSize + 14;
    } catch {
      textX = margin;
    }
  }

  const companyName = company.name || "Documento";
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#000000");
  doc.text(companyName, textX, top, { width: 280, lineBreak: false });

  doc.font("Helvetica").fontSize(10).fillColor("#52525b");
  let y = top + 22;
  const lines = [
    company.address,
    company.vat ? `P.IVA: ${company.vat}` : null,
    [company.phone, company.email].filter(Boolean).join(" · "),
    company.website,
  ].filter(Boolean) as string[];

  for (const line of lines) {
    doc.text(line, textX, y, { width: 280 });
    y = doc.y + 2;
  }

  if (options?.titleRight) {
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(14);
    doc.text(options.titleRight, margin, top, {
      align: "right",
      width: doc.page.width - margin * 2,
    });
    if (options.subtitleRight?.length) {
      doc.font("Helvetica").fontSize(10).fillColor("#52525b");
      for (const line of options.subtitleRight) {
        doc.text(line, margin, doc.y, {
          align: "right",
          width: doc.page.width - margin * 2,
        });
      }
    }
  }

  doc.fillColor("#000000").font("Helvetica");
  const headerBottom = Math.max(y, top + logoSize) + 12;
  doc.y = headerBottom;
  doc.x = margin;
}

export function drawPdfSignatureBlock(
  doc: PdfDoc,
  options: {
    clientSignature?: string | null;
    signedAt?: Date | null;
    label?: string;
  }
): void {
  if (doc.y > 620) doc.addPage();

  doc.moveDown(1.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
  doc.text(options.label || "Accettazione preventivo", 50, doc.y, { underline: true });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(9).fillColor("#52525b");

  const sig = options.clientSignature?.trim();
  if (sig?.startsWith("data:image")) {
    try {
      const base64 = sig.includes(",") ? sig.split(",")[1]! : sig;
      const buf = Buffer.from(base64, "base64");
      const y = doc.y;
      doc.image(buf, 50, y, { width: 200, height: 70, fit: [200, 70] });
      doc.y = y + 78;
      if (options.signedAt) {
        doc.text(
          `Firmato digitalmente il ${options.signedAt.toLocaleDateString("it-IT")} alle ${options.signedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          50
        );
      }
      doc.text(
        "Documento accettato e restituito con firma elettronica tramite portale cliente.",
        50,
        doc.y,
        { width: 480 }
      );
    } catch {
      drawEmptySignatureLines(doc);
    }
  } else {
    drawEmptySignatureLines(doc);
  }

  doc.fillColor("#000000");
}

function drawEmptySignatureLines(doc: PdfDoc): void {
  doc.moveDown(0.5);
  doc.text("Il sottoscritto cliente dichiara di accettare le condizioni del presente documento.", 50, doc.y, {
    width: 480,
  });
  doc.moveDown(1);
  doc.text("Data: _________________________", 50);
  doc.moveDown(0.8);
  doc.text("Firma del cliente: _________________________________________________", 50);
  doc.moveDown(0.5);
  doc.fontSize(8).text("(In caso di restituzione cartacea: allegare copia firmata e timbrata)", 50);
}
