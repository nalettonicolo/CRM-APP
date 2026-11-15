import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateItemTotal, calculateQuoteTotals } from "./quoteCalculator.js";

describe("calculateItemTotal", () => {
  it("moltiplica quantità per prezzo", () => {
    assert.equal(calculateItemTotal({ quantity: 2, unitPrice: 10.5 }), 21);
  });

  it("applica lo sconto di riga in percentuale", () => {
    assert.equal(
      calculateItemTotal({ quantity: 3, unitPrice: 100, discount: 10 }),
      270
    );
  });

  it("arrotonda a due decimali", () => {
    assert.equal(calculateItemTotal({ quantity: 1, unitPrice: 10.004 }), 10);
    assert.equal(calculateItemTotal({ quantity: 1, unitPrice: 10.006 }), 10.01);
  });

  it("quantità zero e sconto 100% danno zero", () => {
    assert.equal(calculateItemTotal({ quantity: 0, unitPrice: 50 }), 0);
    assert.equal(
      calculateItemTotal({ quantity: 2, unitPrice: 50, discount: 100 }),
      0
    );
  });

  it("accetta prezzi negativi (nota di credito)", () => {
    assert.equal(calculateItemTotal({ quantity: 1, unitPrice: -50 }), -50);
  });

  it(
    "uno sconto di riga oltre il 100% non dovrebbe dare una riga negativa",
    { todo: "oggi 150% su 100 € restituisce -50 € (nessun limite)" },
    () => {
      assert.ok(
        calculateItemTotal({ quantity: 1, unitPrice: 100, discount: 150 }) >= 0
      );
    }
  );
});

describe("calculateQuoteTotals - IVA", () => {
  it("applica IVA 22% di default", () => {
    const t = calculateQuoteTotals([{ quantity: 2, unitPrice: 100 }]);
    assert.equal(t.subtotal, 200);
    assert.equal(t.vatAmount, 44);
    assert.equal(t.total, 244);
    assert.equal(t.balanceDue, 244);
    assert.equal(t.depositAmount, 0);
  });

  it("rispetta aliquota 0% (non la sostituisce con 22%)", () => {
    const t = calculateQuoteTotals([{ quantity: 1, unitPrice: 100, vatRate: 0 }]);
    assert.equal(t.vatAmount, 0);
    assert.equal(t.total, 100);
  });

  it("somma IVA con aliquote diverse per riga", () => {
    const t = calculateQuoteTotals([
      { quantity: 1, unitPrice: 100, vatRate: 22 },
      { quantity: 1, unitPrice: 50, vatRate: 10 },
    ]);
    assert.equal(t.subtotal, 150);
    assert.equal(t.vatAmount, 27);
    assert.equal(t.total, 177);
  });

  it("arrotonda l'IVA al centesimo", () => {
    // 3 × 33,33 = 99,99 → IVA 21,9978 → 22,00
    const t = calculateQuoteTotals([{ quantity: 3, unitPrice: 33.33 }]);
    assert.equal(t.subtotal, 99.99);
    assert.equal(t.vatAmount, 22);
    assert.equal(t.total, 121.99);
  });

  it("senza righe tutti i totali sono zero", () => {
    const t = calculateQuoteTotals([]);
    assert.deepEqual(t, {
      subtotal: 0,
      vatAmount: 0,
      total: 0,
      depositAmount: 0,
      balanceDue: 0,
      withholdingTaxAmount: 0,
      stampDutyAmount: 0,
      netPayable: 0,
    });
  });
});

describe("calculateQuoteTotals - sconti", () => {
  const items = [
    { quantity: 1, unitPrice: 100, vatRate: 22 },
    { quantity: 1, unitPrice: 50, vatRate: 10 },
  ];

  it("sconto percentuale riduce imponibile e IVA in proporzione", () => {
    const t = calculateQuoteTotals(items, { discountPercent: 10 });
    assert.equal(t.subtotal, 150);
    assert.equal(t.vatAmount, 24.3);
    assert.equal(t.total, 159.3);
  });

  it("sconto percentuale e sconto in importo si sommano", () => {
    const t = calculateQuoteTotals(items, { discountPercent: 10, discountAmount: 30 });
    assert.equal(t.vatAmount, 18.9);
    assert.equal(t.total, 123.9);
  });

  it("lo sconto non supera l'imponibile", () => {
    const t = calculateQuoteTotals(items, { discountAmount: 500 });
    assert.equal(t.vatAmount, 0);
    assert.equal(t.total, 0);
    const t2 = calculateQuoteTotals(items, { discountPercent: 150 });
    assert.equal(t2.total, 0);
  });

  it("uno sconto negativo viene ignorato", () => {
    const base = calculateQuoteTotals(items);
    const t = calculateQuoteTotals(items, { discountAmount: -50 });
    assert.equal(t.total, base.total);
  });
});

describe("calculateQuoteTotals - acconti", () => {
  const items = [{ quantity: 1, unitPrice: 1000, vatRate: 22 }];

  it("acconto in percentuale sul totale con IVA", () => {
    const t = calculateQuoteTotals(items, { depositPercent: 30 });
    assert.equal(t.total, 1220);
    assert.equal(t.depositAmount, 366);
    assert.equal(t.balanceDue, 854);
  });

  it("acconto in importo fisso", () => {
    const t = calculateQuoteTotals(items, { depositAmount: 200 });
    assert.equal(t.depositAmount, 200);
    assert.equal(t.balanceDue, 1020);
  });

  it("se ci sono sia percentuale sia importo vince la percentuale", () => {
    const t = calculateQuoteTotals(items, { depositPercent: 50, depositAmount: 10 });
    assert.equal(t.depositAmount, 610);
    assert.equal(t.balanceDue, 610);
  });

  it("le rate (paymentTerms) hanno la precedenza su acconto semplice", () => {
    const t = calculateQuoteTotals(items, {
      depositPercent: 90,
      paymentTerms: [
        { label: "Acconto", percent: 30 },
        { label: "Saldo", isBalance: true },
      ],
    });
    assert.equal(t.depositAmount, 366);
    assert.equal(t.balanceDue, 854);
  });

  it(
    "un acconto superiore al totale non dovrebbe dare un saldo negativo",
    { todo: "oggi acconto 2000 su totale 1220 restituisce saldo -780" },
    () => {
      const t = calculateQuoteTotals(items, { depositAmount: 2000 });
      assert.ok(t.balanceDue >= 0);
    }
  );
});

describe("calculateQuoteTotals - ritenuta e bollo", () => {
  const items = [{ quantity: 1, unitPrice: 1000, vatRate: 22 }];

  it("ritenuta in percentuale calcolata sull'imponibile scontato", () => {
    const t = calculateQuoteTotals(items, { withholdingTaxPercent: 20 });
    assert.equal(t.withholdingTaxAmount, 200);
    assert.equal(t.netPayable, 1020);
  });

  it("la ritenuta in importo ha la precedenza sulla percentuale", () => {
    const t = calculateQuoteTotals(items, {
      withholdingTaxAmount: 150,
      withholdingTaxPercent: 20,
    });
    assert.equal(t.withholdingTaxAmount, 150);
    assert.equal(t.netPayable, 1070);
  });

  it("bollo si somma al netto da pagare; bollo negativo diventa zero", () => {
    assert.equal(calculateQuoteTotals(items, { stampDutyAmount: 2 }).netPayable, 1222);
    const t = calculateQuoteTotals(items, { stampDutyAmount: -5 });
    assert.equal(t.stampDutyAmount, 0);
    assert.equal(t.netPayable, 1220);
  });
});

describe("calculateQuoteTotals - casi limite", () => {
  it(
    "un preventivo con totale negativo non dovrebbe azzerarsi",
    { todo: "oggi una sola riga da -100 € restituisce totale 0 invece di -122" },
    () => {
      const t = calculateQuoteTotals([{ quantity: 1, unitPrice: -100 }]);
      assert.equal(t.total, -122);
    }
  );

  it("righe positive e negative con somma positiva restano coerenti", () => {
    const t = calculateQuoteTotals([
      { quantity: 1, unitPrice: 100 },
      { quantity: 1, unitPrice: -30 },
    ]);
    assert.equal(t.subtotal, 70);
    assert.equal(t.vatAmount, 15.4);
    assert.equal(t.total, 85.4);
  });
});
