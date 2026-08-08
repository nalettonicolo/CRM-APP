/**
 * Esegue comandi Prisma sul database Impianti Elettrici (DATABASE_URL_IE).
 * Uso: node scripts/prisma-with-ie-url.cjs db push
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(backendDir, ".env") });

const ieUrl = process.env.DATABASE_URL_IE?.trim();
if (!ieUrl) {
  console.error("DATABASE_URL_IE mancante in backend/.env");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/prisma-with-ie-url.cjs <comando prisma...>");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", ...args],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: ieUrl },
  }
);

process.exit(result.status ?? 1);
