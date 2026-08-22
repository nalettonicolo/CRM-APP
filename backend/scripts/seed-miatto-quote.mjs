/**
 * Crea (se manca) il cliente Miatto Fabio e il preventivo Ajax nel DB Impianti Elettrici.
 * Uso locale:  node backend/scripts/seed-miatto-quote.mjs
 * Uso Mint:    cd ~/CRM-APP/backend && node scripts/seed-miatto-quote.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env"), override: true });

const base =
  process.env.API_URL?.replace(/\/$/, "") ||
  process.env.TAILSCALE_FUNNEL_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:4100";
const email = process.env.SEED_ADMIN_EMAIL || "nalettonicolo@gmail.com";
const password = process.env.SEED_ADMIN_PASSWORD || "";

if (!password) {
  console.error("Imposta SEED_ADMIN_PASSWORD in backend/.env");
  process.exit(1);
}

const items = [
  {
    type: "custom",
    description:
      "AJAX StarterKit Cam Plus HDR Wireless — Bianco (art. 38175/38174)",
    quantity: 1,
    unit: "pz",
    unitPrice: 467.23,
    vatRate: 22,
  },
  {
    type: "custom",
    description:
      "AJAX DualCurtain Outdoor — rilevatore movimento tenda bidirezionale esterno — Bianco",
    quantity: 4,
    unit: "pz",
    unitPrice: 159.95,
    vatRate: 22,
  },
  {
    type: "custom",
    description:
      "AJAX MotionProtect Curtain — rilevatore movimento fascio stretto (38196/38195) — Bianco",
    quantity: 1,
    unit: "pz",
    unitPrice: 60.81,
    vatRate: 22,
  },
  {
    type: "custom",
    description:
      "AJAX StreetSiren — sirena wireless esterno (38178/38179) — Bianco",
    quantity: 1,
    unit: "pz",
    unitPrice: 94.59,
    vatRate: 22,
  },
  {
    type: "custom",
    description:
      "AJAX SpaceControl — telecomando 4 pulsanti (38166/38167) — Nero",
    quantity: 1,
    unit: "pz",
    unitPrice: 25.47,
    vatRate: 22,
  },
  {
    type: "custom",
    description:
      "AJAX MotionProtect — rilevatore movimento Pet Immune (38193/38194) — Bianco",
    quantity: 3,
    unit: "pz",
    unitPrice: 49.89,
    vatRate: 22,
  },
];

const notes =
  "Prezzi di acquisto / listino rivenditore da MG Forniture (carrello consultato). IVA 22% applicata sulle righe. Verificare disponibilità colori e aggiornamenti listino prima dell'ordine.";

async function main() {
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginRes.json();
  const token = login.accessToken || login.token;
  if (!token) {
    console.error("Login fallito", loginRes.status, login);
    process.exit(1);
  }
  console.log("Login OK su", base);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Workspace": "ie",
  };

  await fetch(`${base}/api/supplier-catalogs/ensure-ajax`, {
    method: "POST",
    headers,
  });

  const searchRes = await fetch(
    `${base}/api/clients?search=${encodeURIComponent("Miatto")}`,
    { headers }
  );
  const searchJson = await searchRes.json();
  const list = Array.isArray(searchJson)
    ? searchJson
    : searchJson.data || searchJson.clients || [];
  let client = list.find((c) =>
    /miatto/i.test(
      `${c.lastName || ""} ${c.firstName || ""} ${c.companyName || ""} ${c.contactName || ""}`
    )
  );

  if (!client) {
    const createClient = await fetch(`${base}/api/clients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        firstName: "Fabio",
        lastName: "Miatto",
        contactName: "Miatto Fabio",
        companyName: "Miatto Fabio",
        status: "ACTIVE",
      }),
    });
    client = await createClient.json();
    if (!createClient.ok) {
      console.error("Creazione cliente fallita", createClient.status, client);
      process.exit(1);
    }
    console.log("Cliente creato:", client.id, client.companyName || client.contactName);
  } else {
    console.log("Cliente trovato:", client.id, client.companyName || client.contactName);
  }

  const quotesRes = await fetch(`${base}/api/quotes?search=Miatto`, { headers });
  const quotesJson = await quotesRes.json();
  const quotes = quotesJson.data || quotesJson.quotes || [];
  const existing = quotes.find(
    (q) =>
      q.clientId === client.id &&
      /antifurto ajax/i.test(q.title || "")
  );
  if (existing) {
    console.log("Preventivo già presente:", existing.number, existing.id);
    return;
  }

  const quoteRes = await fetch(`${base}/api/quotes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clientId: client.id,
      title: "Impianto antifurto Ajax — fornitura dispositivi",
      notes,
      items,
    }),
  });
  const quote = await quoteRes.json();
  if (!quoteRes.ok) {
    console.error("Creazione preventivo fallita", quoteRes.status, quote);
    process.exit(1);
  }
  console.log("Preventivo creato:", quote.number, quote.id, "totale", quote.total);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
