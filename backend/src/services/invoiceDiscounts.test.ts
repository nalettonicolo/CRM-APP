import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  discountDeduction,
  discountsFromQuote,
  parseInvoiceDiscounts,
} from "./invoiceDiscounts.js";

describe("parseInvoiceDiscounts", () => {
  it("restituisce lista vuota se l'input non è un array", () => {
    assert.deepEqual(parseInvoiceDiscounts(null), []);
    assert.deepEqual(parseInvoiceDiscounts(undefined), []);
    assert.deepEqual(parseInvoiceDiscounts("sconto"), []);
    assert.deepEqual(parseInvoiceDiscounts({ description: "x" }), []);
  });

  it("mantiene le righe valide", () => {
    const rows = [
      { description: "Fedeltà", mode: "PERCENT", value: 5 },
      { description: "Omaggio", mode: "AMOUNT", value: 20.5 },
    ];
    assert.deepEqual(parseInvoiceDiscounts(rows), rows);
  });

  it("scarta righe non valide senza bloccare le altre", () => {
    const rows = [
      { description: "", mode: "PERCENT", value: 5 },
      { description: "Negativo", mode: "AMOUNT", value: -1 },
      { description: "Modo errato", mode: "FIXED", value: 3 },
      { description: "Testo", mode: "AMOUNT", value: "10" },
      null,
      { description: "Buona", mode: "AMOUNT", value: 0 },
    ];
    assert.deepEqual(parseInvoiceDiscounts(rows), [
      { description: "Buona", mode: "AMOUNT", value: 0 },
    ]);
  });
});

describe("discountDeduction", () => {
  it("sconto percentuale sul subtotale", () => {
    assert.equal(discountDeduction(200, { description: "x", mode: "PERCENT", value: 10 }), 20);
  });

  it("arrotonda la percentuale al centesimo", () => {
    assert.equal(discountDeduction(33.33, { description: "x", mode: "PERCENT", value: 10 }), 3.33);
  });

  it("sconto in importo, arrotondato al centesimo", () => {
    assert.equal(discountDeduction(500, { description: "x", mode: "AMOUNT", value: 12.344 }), 12.34);
  });

  it("valore zero non toglie nulla", () => {
    assert.equal(discountDeduction(100, { description: "x", mode: "PERCENT", value: 0 }), 0);
    assert.equal(discountDeduction(100, { description: "x", mode: "AMOUNT", value: 0 }), 0);
  });

  it("subtotale zero con percentuale dà zero", () => {
    assert.equal(discountDeduction(0, { description: "x", mode: "PERCENT", value: 50 }), 0);
  });

  it(
    "la detrazione non dovrebbe superare il subtotale",
    { todo: "oggi 150% su 100 € restituisce 150 € (nessun limite)" },
    () => {
      assert.ok(
        discountDeduction(100, { description: "x", mode: "PERCENT", value: 150 }) <= 100
      );
    }
  );
});

describe("discountsFromQuote", () => {
  it("nessuno sconto se percentuale e importo sono zero o vuoti", () => {
    assert.deepEqual(discountsFromQuote({ discountPercent: 0, discountAmount: 0 }), []);
    assert.deepEqual(discountsFromQuote({ discountPercent: null, discountAmount: null }), []);
    assert.deepEqual(discountsFromQuote({ discountPercent: undefined, discountAmount: undefined }), []);
  });

  it("converte valori Decimal/stringa in numeri", () => {
    const rows = discountsFromQuote({ discountPercent: "10.5", discountAmount: 0 });
    assert.deepEqual(rows, [
      { description: "Sconto percentuale", mode: "PERCENT", value: 10.5 },
    ]);
  });

  it("restituisce prima la percentuale e poi l'importo", () => {
    const rows = discountsFromQuote({ discountPercent: 5, discountAmount: 30 });
    assert.deepEqual(
      rows.map((r) => r.mode),
      ["PERCENT", "AMOUNT"]
    );
  });

  it("ignora valori negativi", () => {
    assert.deepEqual(discountsFromQuote({ discountPercent: -5, discountAmount: -10 }), []);
  });
});
