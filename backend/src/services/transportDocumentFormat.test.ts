import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTransportDocumentNumber,
  nextTransportDocumentNumber,
} from "./transportDocumentFormat.js";

describe("nextTransportDocumentNumber", () => {
  it("parte da DDT-anno-0001 se non ci sono numeri", () => {
    assert.equal(nextTransportDocumentNumber([], 2026), "DDT-2026-0001");
  });

  it("incrementa il numero più alto dell'anno", () => {
    assert.equal(
      nextTransportDocumentNumber(["DDT-2026-0001", "DDT-2026-0002"], 2026),
      "DDT-2026-0003"
    );
  });

  it("usa massimo + 1 anche con buchi", () => {
    assert.equal(
      nextTransportDocumentNumber(["DDT-2026-0001", "DDT-2026-0010"], 2026),
      "DDT-2026-0011"
    );
  });

  it("ignora altri anni e formati diversi", () => {
    assert.equal(
      nextTransportDocumentNumber(["DDT-2025-0099", "2026-0005", "DDT-2026-x", "DDT-2026-0003-bis"], 2026),
      "DDT-2026-0001"
    );
  });

  it("gestisce progressivi non riempiti con zeri e oltre 9999", () => {
    assert.equal(nextTransportDocumentNumber(["DDT-2026-7"], 2026), "DDT-2026-0008");
    assert.equal(nextTransportDocumentNumber(["DDT-2026-9999"], 2026), "DDT-2026-10000");
  });
});

describe("formatTransportDocumentNumber", () => {
  it("riempie con zeri fino a 4 cifre", () => {
    assert.equal(formatTransportDocumentNumber("DDT-2026-7"), "DDT-2026-0007");
    assert.equal(formatTransportDocumentNumber("DDT-2026-0007"), "DDT-2026-0007");
  });

  it("lascia invariati i formati non riconosciuti", () => {
    assert.equal(formatTransportDocumentNumber("BOZZA"), "BOZZA");
    assert.equal(formatTransportDocumentNumber(""), "");
    assert.equal(formatTransportDocumentNumber("ddt-2026-7"), "ddt-2026-7");
  });
});
