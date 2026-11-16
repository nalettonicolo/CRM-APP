import fs from "fs";

/**
 * Immagini per i PDF (pdfkit e pdf-lib accettano solo PNG e JPEG).
 * Le foto e i loghi in WebP vengono convertiti in PNG con `sharp`, se è installato nel backend
 * (`npm install sharp` nella cartella backend). Senza sharp le WebP restano caricabili e scaricabili
 * dall'app, ma nei PDF compare una riga che lo spiega invece dell'immagine.
 */
type Sharp = (input: Buffer) => { png: () => { toBuffer: () => Promise<Buffer> } };
let sharpModule: Sharp | null | undefined;

async function loadSharp(): Promise<Sharp | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    const name = "sharp"; // import dinamico: sharp è facoltativo
    const mod = (await import(name)) as { default?: Sharp };
    sharpModule = (mod.default ?? (mod as unknown as Sharp)) || null;
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

export function isPng(buf: Buffer): boolean {
  return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}
export function isJpeg(buf: Buffer): boolean {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}
export function isWebp(buf: Buffer): boolean {
  return buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
}

/** Restituisce l'immagine pronta per il PDF (PNG o JPEG) oppure null se non si può inserire. */
export async function imageForPdf(buf: Buffer): Promise<{ data: Buffer; kind: "png" | "jpg" } | null> {
  if (isPng(buf)) return { data: buf, kind: "png" };
  if (isJpeg(buf)) return { data: buf, kind: "jpg" };
  if (isWebp(buf)) {
    const sharp = await loadSharp();
    if (!sharp) return null;
    try {
      return { data: await sharp(buf).png().toBuffer(), kind: "png" };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Percorso di un'immagine utilizzabile da pdfkit: per i file WebP crea (una volta) una copia PNG accanto
 * all'originale. Se la conversione non è possibile restituisce null (il PDF esce senza quell'immagine).
 */
export async function pdfReadyImagePath(filePath: string): Promise<string | null> {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(filePath);
  } catch {
    return null;
  }
  if (!isWebp(buf)) return filePath;
  const converted = `${filePath}.pdf.png`;
  if (fs.existsSync(converted) && fs.statSync(converted).mtimeMs >= fs.statSync(filePath).mtimeMs) return converted;
  const img = await imageForPdf(buf);
  if (!img) return null;
  fs.writeFileSync(converted, img.data);
  return converted;
}
