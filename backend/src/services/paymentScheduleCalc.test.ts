import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocatePaymentsToTerms,
  buildClientPaymentOverview,
  clientDisplayName,
  defaultDueDate,
  isAcceptanceDepositTerm,
  rowStatus,
} from "./paymentScheduleCalc.js";

// Giorno di riferimento fisso (ora locale) per rendere le prove ripetibili.
const NOW = new Date(2026, 5, 15, 12, 0, 0);
const FUTURE = new Date(2026, 5, 20, 9, 0, 0);
const PAST = new Date(2026, 5, 1, 9, 0, 0);

describe("rowStatus", () => {
  it("importo zero o negativo è considerato pagato", () => {
    assert.equal(rowStatus(0, 0, PAST, NOW), "PAID");
    assert.equal(rowStatus(-10, 0, PAST, NOW), "PAID");
  });

  it("pagato per intero, con tolleranza di un centesimo, o in eccesso", () => {
    assert.equal(rowStatus(100, 100, FUTURE, NOW), "PAID");
    assert.equal(rowStatus(100, 99.995, FUTURE, NOW), "PAID");
    assert.equal(rowStatus(100, 150, FUTURE, NOW), "PAID");
  });

  it("pagato in parte è PARTIAL", () => {
    assert.equal(rowStatus(100, 40, FUTURE, NOW), "PARTIAL");
  });

  it("una rata pagata in parte e già scaduta resta PARTIAL (non OVERDUE)", () => {
    assert.equal(rowStatus(100, 40, PAST, NOW), "PARTIAL");
  });

  it("incassi sotto il centesimo non contano come pagamento", () => {
    assert.equal(rowStatus(100, 0.005, FUTURE, NOW), "PENDING");
  });

  it("non pagato: scaduto è OVERDUE, in scadenza oggi o dopo è PENDING", () => {
    assert.equal(rowStatus(100, 0, PAST, NOW), "OVERDUE");
    assert.equal(rowStatus(100, 0, new Date(2026, 5, 14, 23, 59, 0), NOW), "OVERDUE");
    assert.equal(rowStatus(100, 0, new Date(2026, 5, 15, 0, 0, 0), NOW), "PENDING");
    assert.equal(rowStatus(100, 0, FUTURE, NOW), "PENDING");
  });
});

describe("defaultDueDate", () => {
  const createdAt = new Date(2026, 0, 1);
  const validUntil = new Date(2026, 1, 1);
  const eventAt = new Date(2026, 2, 1);
  const acceptedAt = new Date(2026, 3, 1);

  it("segue la priorità accettazione, evento, validità, creazione", () => {
    assert.equal(defaultDueDate({ acceptedAt, eventAt, validUntil, createdAt }), acceptedAt);
    assert.equal(defaultDueDate({ acceptedAt: null, eventAt, validUntil, createdAt }), eventAt);
    assert.equal(defaultDueDate({ acceptedAt: null, eventAt: null, validUntil, createdAt }), validUntil);
    assert.equal(
      defaultDueDate({ acceptedAt: null, eventAt: null, validUntil: null, createdAt }),
      createdAt
    );
  });
});

describe("clientDisplayName", () => {
  const empty = { companyName: null, contactName: null, firstName: null, lastName: null };

  it("preferisce ragione sociale, poi referente, poi nome e cognome", () => {
    assert.equal(clientDisplayName({ ...empty, companyName: "Acme", contactName: "Luca" }), "Acme");
    assert.equal(clientDisplayName({ ...empty, contactName: "Luca" }), "Luca");
    assert.equal(clientDisplayName({ ...empty, firstName: "Anna", lastName: "Rossi" }), "Anna Rossi");
    assert.equal(clientDisplayName({ ...empty, lastName: "Rossi" }), "Rossi");
  });

  it("usa 'Cliente' se non c'è alcun nome (anche stringhe vuote)", () => {
    assert.equal(clientDisplayName(empty), "Cliente");
    assert.equal(clientDisplayName({ ...empty, companyName: "", firstName: "" }), "Cliente");
  });
});

describe("isAcceptanceDepositTerm", () => {
  const base = { id: "t", label: "", note: null, amount: 100, isBalance: false, dueDate: null };

  it("riconosce 'accettazione' nell'etichetta o nella nota, senza badare ad accenti e maiuscole", () => {
    assert.equal(isAcceptanceDepositTerm({ ...base, label: "Acconto all'accettazione" }), true);
    assert.equal(isAcceptanceDepositTerm({ ...base, label: "Acconto", note: "Da versare ALL'ACCETTAZIONE" }), true);
    assert.equal(isAcceptanceDepositTerm({ ...base, label: "Acconto accettaz." }), true);
  });

  it("esclude saldo, importo zero e altre rate", () => {
    assert.equal(isAcceptanceDepositTerm({ ...base, label: "Accettazione", isBalance: true }), false);
    assert.equal(isAcceptanceDepositTerm({ ...base, label: "Accettazione", amount: 0 }), false);
    assert.equal(isAcceptanceDepositTerm({ ...base, label: "A metà lavori" }), false);
  });
});

describe("allocatePaymentsToTerms", () => {
  const terms = [
    { id: "t1", amount: 300 },
    { id: "t2", amount: 700 },
  ];

  it("senza pagamenti tutte le rate sono a zero", () => {
    assert.deepEqual([...allocatePaymentsToTerms(terms, []).entries()], [
      ["t1", 0],
      ["t2", 0],
    ]);
  });

  it("somma i pagamenti collegati alla rata (anche con importi testuali)", () => {
    const paid = allocatePaymentsToTerms(terms, [
      { id: "p1", quotePaymentTermId: "t1", amount: 100 },
      { id: "p2", quotePaymentTermId: "t1", amount: "50.50" },
    ]);
    assert.equal(paid.get("t1"), 150.5);
    assert.equal(paid.get("t2"), 0);
  });

  it("distribuisce i pagamenti senza rata nell'ordine delle rate", () => {
    const paid = allocatePaymentsToTerms(terms, [
      { id: "p1", quotePaymentTermId: null, amount: 400 },
    ]);
    assert.equal(paid.get("t1"), 300);
    assert.equal(paid.get("t2"), 100);
  });

  it("l'eccedenza oltre il totale delle rate non viene assegnata", () => {
    const paid = allocatePaymentsToTerms([{ id: "t1", amount: 100 }], [
      { id: "p1", quotePaymentTermId: null, amount: 500 },
    ]);
    assert.equal(paid.get("t1"), 100);
  });

  it("una rata già pagata direttamente non assorbe i pagamenti liberi", () => {
    const paid = allocatePaymentsToTerms(
      [
        { id: "t1", amount: 100 },
        { id: "t2", amount: 200 },
      ],
      [
        { id: "p1", quotePaymentTermId: "t1", amount: 100 },
        { id: "p2", quotePaymentTermId: null, amount: 50 },
      ]
    );
    assert.equal(paid.get("t1"), 100);
    assert.equal(paid.get("t2"), 50);
  });

  it("un pagamento collegato a una rata inesistente non viene conteggiato", () => {
    const paid = allocatePaymentsToTerms([{ id: "t1", amount: 100 }], [
      { id: "p1", quotePaymentTermId: "zzz", amount: 100 },
    ]);
    assert.equal(paid.get("t1"), 0);
  });
});

function makeQuote(over: Record<string, unknown> = {}) {
  return {
    id: "q1",
    number: "PRV-2026-001",
    title: "Impianto",
    status: "ACCEPTED",
    acceptedAt: FUTURE,
    eventAt: null,
    validUntil: null,
    createdAt: PAST,
    depositAmount: 0,
    paymentTerms: [],
    payments: [],
    invoicePreviews: [],
    ...over,
  };
}

function build(quotes: unknown[], invoices: unknown[] = []) {
  return buildClientPaymentOverview(quotes as never, invoices as never, NOW);
}

describe("buildClientPaymentOverview - preventivi", () => {
  it("senza dati restituisce tutto a zero", () => {
    assert.deepEqual(build([]), {
      open: [],
      closed: [],
      schedule: [],
      summary: { openAmount: 0, closedAmount: 0, overdueCount: 0, upcomingCount: 0 },
    });
  });

  it("acconto semplice del preventivo: una riga in attesa", () => {
    const r = build([makeQuote({ depositAmount: "300" })]);
    assert.equal(r.schedule.length, 1);
    const row = r.schedule[0];
    assert.equal(row.id, "quote-q1");
    assert.equal(row.label, "Acconto all'accettazione");
    assert.equal(row.amount, 300);
    assert.equal(row.remaining, 300);
    assert.equal(row.status, "PENDING");
    assert.equal(row.dueDate, FUTURE.toISOString());
    assert.equal(r.summary.upcomingCount, 1);
  });

  it("acconto scaduto e non pagato è in ritardo", () => {
    const r = build([makeQuote({ depositAmount: 300, acceptedAt: PAST })]);
    assert.equal(r.schedule[0].status, "OVERDUE");
    assert.equal(r.summary.overdueCount, 1);
    assert.equal(r.summary.upcomingCount, 0);
  });

  it("acconto pagato in parte: resta il residuo", () => {
    const r = build([
      makeQuote({
        depositAmount: 300,
        payments: [{ id: "p1", quotePaymentTermId: null, amount: 100 }],
      }),
    ]);
    assert.equal(r.schedule[0].status, "PARTIAL");
    assert.equal(r.schedule[0].paidAmount, 100);
    assert.equal(r.schedule[0].remaining, 200);
  });

  it("acconto pagato per intero: nessuna riga nello scadenzario", () => {
    const r = build([
      makeQuote({
        depositAmount: 300,
        payments: [{ id: "p1", quotePaymentTermId: null, amount: 300 }],
      }),
    ]);
    assert.deepEqual(r.schedule, []);
  });

  it("acconto zero: nessuna riga", () => {
    assert.deepEqual(build([makeQuote({ depositAmount: 0 })]).schedule, []);
  });

  it("salta preventivi non accettati o già fatturati", () => {
    const r = build([
      makeQuote({ id: "a", status: "DRAFT", depositAmount: 100 }),
      makeQuote({ id: "b", depositAmount: 100, invoicePreviews: [{ id: "i" }] }),
    ]);
    assert.deepEqual(r.schedule, []);
  });

  it("con una rata 'all'accettazione' usa le rate e ignora l'acconto semplice", () => {
    const termDue = new Date(2026, 5, 10, 9, 0, 0);
    const r = build([
      makeQuote({
        depositAmount: 999,
        paymentTerms: [
          { id: "t1", label: "Acconto all'accettazione", note: null, amount: "400", isBalance: false, dueDate: termDue },
          { id: "t2", label: "Saldo", note: null, amount: "600", isBalance: true, dueDate: null },
        ],
      }),
    ]);
    assert.equal(r.schedule.length, 1);
    assert.equal(r.schedule[0].id, "t1");
    assert.equal(r.schedule[0].amount, 400);
    assert.equal(r.schedule[0].status, "OVERDUE");
  });

  it("ordina lo scadenzario per data di scadenza crescente", () => {
    const r = build([
      makeQuote({ id: "late", depositAmount: 100, acceptedAt: new Date(2026, 6, 30) }),
      makeQuote({ id: "soon", depositAmount: 100, acceptedAt: new Date(2026, 5, 16) }),
    ]);
    assert.deepEqual(
      r.schedule.map((s) => s.quoteId),
      ["soon", "late"]
    );
  });
});

describe("buildClientPaymentOverview - fatture", () => {
  it("separa fatture aperte e chiuse e calcola i totali", () => {
    const r = build(
      [],
      [
        { id: "i1", number: "2026-001", quoteId: "q1", total: "1220", balanceDue: "1220", paymentStatus: "UNPAID" },
        { id: "i2", number: null, quoteId: null, total: "500", balanceDue: "0", paymentStatus: "PAID" },
        { id: "i3", number: "2026-002", quoteId: "q2", total: "1000", balanceDue: "400", paymentStatus: "PARTIAL" },
      ]
    );
    assert.deepEqual(
      r.open.map((x) => x.id),
      ["i1", "i3"]
    );
    assert.equal(r.open[0].title, null);
    assert.equal(r.open[0].href, "/invoices/i1");
    assert.equal(r.closed.length, 1);
    assert.equal(r.closed[0].number, "BOZZA");
    assert.equal(r.closed[0].title, "Documento di cortesia");
    assert.equal(r.summary.openAmount, 1620);
    assert.equal(r.summary.closedAmount, 500);
  });
});
