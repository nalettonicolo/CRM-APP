import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedOrigin } from "./corsOrigin.js";
import {
  assertProductionSecrets,
  findInsecureProductionSettings,
} from "./productionChecks.js";
import { signRefreshToken, verifyRefreshToken } from "./jwt.js";

const allowed = ["https://crm.example.it", "http://localhost:3000"];

describe("isAllowedOrigin", () => {
  it("accetta richieste senza Origin e origini in elenco", () => {
    assert.equal(isAllowedOrigin(undefined, allowed, false), true);
    assert.equal(isAllowedOrigin("https://crm.example.it", allowed, false), true);
  });

  it("rifiuta *.netlify.app se ALLOW_NETLIFY_PREVIEWS non è attivo", () => {
    assert.equal(isAllowedOrigin("https://sito-attaccante.netlify.app", allowed, false), false);
    assert.equal(isAllowedOrigin("https://netlify.app", allowed, false), false);
  });

  it("accetta *.netlify.app solo con ALLOW_NETLIFY_PREVIEWS attivo", () => {
    assert.equal(isAllowedOrigin("https://branch--crm.netlify.app", allowed, true), true);
  });

  it("rifiuta origini simili o non https anche con il flag attivo", () => {
    assert.equal(isAllowedOrigin("http://crm.netlify.app", allowed, true), false);
    assert.equal(isAllowedOrigin("https://crm.netlify.app.evil.com", allowed, true), false);
    assert.equal(isAllowedOrigin("https://evil.com", allowed, true), false);
  });
});

describe("controllo segreti in produzione", () => {
  const good = {
    NODE_ENV: "production",
    JWT_SECRET: "a".repeat(48),
    JWT_REFRESH_SECRET: "b".repeat(48),
    ADMIN_PASSWORD: "Una-Password-Lunga-e-Casuale-93!",
  };

  it("non controlla nulla fuori dalla produzione", () => {
    assert.deepEqual(findInsecureProductionSettings({ NODE_ENV: "development" }), []);
    assert.deepEqual(findInsecureProductionSettings({}), []);
  });

  it("accetta segreti reali", () => {
    assert.doesNotThrow(() => assertProductionSecrets(good));
  });

  it("segnala variabili mancanti o vuote", () => {
    assert.deepEqual(
      findInsecureProductionSettings({ NODE_ENV: "production", JWT_SECRET: "  " }),
      ["JWT_SECRET", "JWT_REFRESH_SECRET", "ADMIN_PASSWORD"]
    );
  });

  it("segnala i valori di prova (default del codice e di .env.example)", () => {
    const bad = {
      NODE_ENV: "production",
      JWT_SECRET: "dev-secret-change-in-production-min-32",
      JWT_REFRESH_SECRET: "your-super-secret-refresh-key-min-32-chars",
      ADMIN_PASSWORD: "Admin123!",
    };
    assert.deepEqual(findInsecureProductionSettings(bad), [
      "JWT_SECRET",
      "JWT_REFRESH_SECRET",
      "ADMIN_PASSWORD",
    ]);
  });

  it("l'errore elenca i nomi ma non i valori", () => {
    assert.throws(
      () => assertProductionSecrets({ ...good, ADMIN_PASSWORD: "Admin123!" }),
      (e: Error) =>
        e.message.includes("ADMIN_PASSWORD") && !e.message.includes("Admin123!")
    );
  });
});

describe("token di rinnovo", () => {
  it("due token emessi insieme sono diversi (serve per la rotazione)", () => {
    const a = signRefreshToken({ userId: "u1" });
    const b = signRefreshToken({ userId: "u1" });
    assert.notEqual(a, b);
    assert.equal(verifyRefreshToken(a).userId, "u1");
    assert.equal(verifyRefreshToken(b).userId, "u1");
  });
});
