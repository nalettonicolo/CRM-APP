#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

console.log("🚀 Setup CRM Gestionale SaaS\n");

if (!fs.existsSync(path.join(root, "backend", ".env"))) {
  fs.copyFileSync(
    path.join(root, "backend", ".env.example"),
    path.join(root, "backend", ".env")
  );
  console.log("✓ Creato backend/.env da .env.example");
}

if (!fs.existsSync(path.join(root, "frontend", ".env.local"))) {
  fs.copyFileSync(
    path.join(root, "frontend", ".env.example"),
    path.join(root, "frontend", ".env.local")
  );
  console.log("✓ Creato frontend/.env.local da .env.example");
}

run("npm install");
run("npm run db:generate --workspace=backend");

try {
  run("npm run db:push --workspace=backend");
} catch {
  console.log("⚠ db:push fallito — avvia PostgreSQL e riprova");
}

try {
  run("npm run db:seed --workspace=backend");
} catch {
  console.log("⚠ Seed fallito — verifica connessione database");
}

console.log("\n✅ Setup completato!");
console.log("\nAvvia con: npm run dev");
console.log("  Frontend: http://localhost:3000");
console.log("  API:      http://localhost:4000");
