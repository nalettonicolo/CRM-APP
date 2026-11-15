import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSequentialDocumentNumber,
  nextSequentialDocumentNumber,
  parseDocumentNumber,
} from "./documentNumbering.js";

describe("parseDocumentNumber", () => {
  it("legge numeri senza prefisso", () => {
    assert.deepEqual(parseDocumentNumber("2026-003"), { prefix: "", year: 2026, seq: 3 });
  });

  it("legge numeri con prefisso", () => {
    assert.deepEqual(parseDocumentNumber("PRV-2026-012"), { prefix: "PRV", year: 2026, seq: 12 });
  });

  it("rifiuta formati non validi", () => {
    for (const bad of ["", "BOZZA", "2026", "PRV-26-1", "PRV-2026-", "prv-2026-1", "A1-2026-1", "2026-003-bis"]) {
      assert.equal(parseDocumentNumber(bad), null, bad);
    }
  });
});

describe("formatSequentialDocumentNumber", () => {
  it("usa BOZZA (o il testo indicato) se il numero manca", () => {
    assert.equal(formatSequentialDocumentNumber(null), "BOZZA");
    assert.equal(formatSequentialDocumentNumber(undefined), "BOZZA");
    assert.equal(formatSequentialDocumentNumber("   "), "BOZZA");
    assert.equal(formatSequentialDocumentNumber("", { fallback: "—" }), "—");
  });

  it("non tocca i numeri di bozza", () => {
    assert.equal(formatSequentialDocumentNumber("BOZZA-1"), "BOZZA-1");
  });

  it("riempie con zeri la parte progressiva", () => {
    assert.equal(formatSequentialDocumentNumber("2026-3"), "2026-003");
    assert.equal(formatSequentialDocumentNumber("PRV-2026-7"), "PRV-2026-007");
    assert.equal(formatSequentialDocumentNumber("PRV-2026-7", { padLength: 5 }), "PRV-2026-00007");
  });

  it("non tronca progressivi più lunghi della lunghezza", () => {
    assert.equal(formatSequentialDocumentNumber("PRV-2026-1234"), "PRV-2026-1234");
  });

  it("lascia invariati i numeri con formato personalizzato", () => {
    assert.equal(formatSequentialDocumentNumber("ABC"), "ABC");
  });
});

describe("nextSequentialDocumentNumber", () => {
  it("parte da 001 se non ci sono numeri", () => {
    assert.equal(nextSequentialDocumentNumber([], 2026), "2026-001");
    assert.equal(nextSequentialDocumentNumber([], 2026, { prefix: "PRV" }), "PRV-2026-001");
  });

  it("incrementa il numero più alto dell'anno", () => {
    assert.equal(nextSequentialDocumentNumber(["2026-001", "2026-002"], 2026), "2026-003");
    assert.equal(nextSequentialDocumentNumber(["2026-7"], 2026), "2026-008");
  });

  it("non riutilizza i buchi (usa massimo + 1)", () => {
    assert.equal(nextSequentialDocumentNumber(["2026-001", "2026-005"], 2026), "2026-006");
  });

  it("riparte da 001 ogni anno", () => {
    assert.equal(nextSequentialDocumentNumber(["2025-040"], 2026), "2026-001");
    assert.equal(nextSequentialDocumentNumber(["2025-040", "2026-002"], 2026), "2026-003");
  });

  it("senza prefisso conta anche il vecchio prefisso FPR", () => {
    assert.equal(nextSequentialDocumentNumber(["FPR-2026-010"], 2026), "2026-011");
  });

  it("con prefisso conta anche i numeri senza prefisso dello stesso anno", () => {
    assert.equal(
      nextSequentialDocumentNumber(["PRV-2026-004", "2026-009"], 2026, { prefix: "PRV" }),
      "PRV-2026-010"
    );
  });

  it("ignora i numeri di un altro prefisso", () => {
    assert.equal(
      nextSequentialDocumentNumber(["XYZ-2026-050"], 2026, { prefix: "PRV" }),
      "PRV-2026-001"
    );
  });

  it("conta i prefissi precedenti (legacyPrefixes)", () => {
    assert.equal(
      nextSequentialDocumentNumber(["PR-2026-020"], 2026, { prefix: "PRV", legacyPrefixes: ["PR"] }),
      "PRV-2026-021"
    );
  });

  it("ignora numeri non validi", () => {
    assert.equal(
      nextSequentialDocumentNumber(["BOZZA", "", "2026-003-bis", "abc"], 2026),
      "2026-001"
    );
  });

  it("rispetta padLength e non tronca oltre", () => {
    assert.equal(nextSequentialDocumentNumber([], 2026, { padLength: 4 }), "2026-0001");
    assert.equal(nextSequentialDocumentNumber(["2026-999"], 2026), "2026-1000");
  });
});
