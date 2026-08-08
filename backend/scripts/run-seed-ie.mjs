import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const envPath = path.join(backendDir, ".env");

const parsed = fs.existsSync(envPath)
  ? dotenv.parse(fs.readFileSync(envPath))
  : {};

const strip = (v) => (v || "").trim().replace(/^"|"$/g, "");
const crmUrl = strip(parsed.DATABASE_URL || process.env.DATABASE_URL);
const ieUrl = strip(parsed.DATABASE_URL_IE || process.env.DATABASE_URL_IE);

if (!ieUrl) {
  console.error("DATABASE_URL_IE mancante in backend/.env");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "prisma/seed-impianti-elettrici.ts"],
  {
    cwd: backendDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      DATABASE_URL: ieUrl,
      ...(crmUrl ? { DATABASE_URL_CRM: crmUrl } : {}),
    },
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
