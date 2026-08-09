import fs from "fs";
import app from "./app.js";
import { config } from "./config/index.js";
import { initPermissionStore } from "./services/permissionStore.js";

fs.mkdirSync(config.upload.dir, { recursive: true });
fs.mkdirSync(config.backup.dir, { recursive: true });

async function start() {
  try {
    await initPermissionStore();
  } catch (err) {
    console.error("⚠️  Inizializzazione permessi fallita:", err);
  }

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`🚀 API CRM in ascolto su http://localhost:${config.port}`);
    console.log(`   Ambiente: ${config.env}`);
  });

  // Cataloghi PDF grandi (fino a ~150 MB) via Tailscale Funnel
  server.timeout = 60 * 60 * 1000;
  server.headersTimeout = 61 * 60 * 1000;
  server.requestTimeout = 60 * 60 * 1000;
  server.keepAliveTimeout = 120 * 1000;

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `❌ Porta ${config.port} già in uso. Ferma l'altro processo o cambia PORT nel .env`
      );
    } else {
      console.error("❌ Errore avvio server:", err);
    }
    process.exit(1);
  });
}

void start();

