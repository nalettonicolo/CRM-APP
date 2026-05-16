/**
 * Rimuove frontend/.next per evitare errori Windows (ENOTEMPTY, cache webpack)
 * durante build ripetute o dopo interruzioni.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "frontend", ".next");
try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}
