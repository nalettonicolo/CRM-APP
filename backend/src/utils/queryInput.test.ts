import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrContains,
  optionalEnum,
  optionalId,
  parseOptionalDate,
  parsePagination,
  sanitizeSearchTerm,
} from "./queryInput.js";

describe("sanitizeSearchTerm", () => {
  it("rimuove wildcard LIKE e null byte", () => {
    assert.equal(sanitizeSearchTerm("acme%_"), "acme");
    assert.equal(sanitizeSearchTerm("a\0b"), "ab");
  });

  it("tronca input troppo lungo", () => {
    const long = "x".repeat(200);
    assert.equal(sanitizeSearchTerm(long, 10).length, 10);
  });

  it("mantiene testo letterale senza wildcard per payload SQL-like", () => {
    const payload = "'; DROP TABLE \"Client\"; --";
    const sanitized = sanitizeSearchTerm(payload);
    assert.equal(sanitized, payload);
    assert.doesNotMatch(sanitized, /%|_/);
  });
});

describe("optionalId", () => {
  it("accetta id normali", () => {
    assert.equal(optionalId("clxyz123"), "clxyz123");
  });

  it("rifiuta pattern SQL injection", () => {
    assert.equal(optionalId("1' OR '1'='1"), undefined);
    assert.equal(optionalId("abc; DROP TABLE users"), undefined);
    assert.equal(optionalId("id--comment"), undefined);
  });
});

describe("parsePagination", () => {
  it("limita take e normalizza page", () => {
    assert.deepEqual(parsePagination("-3", "9999"), { page: 1, take: 100, skip: 0 });
    assert.deepEqual(parsePagination("2", "10"), { page: 2, take: 10, skip: 10 });
  });

  it("gestisce NaN", () => {
    assert.deepEqual(parsePagination("foo", "bar"), { page: 1, take: 20, skip: 0 });
  });
});

describe("optionalEnum", () => {
  it("accetta solo valori in allowlist", () => {
    const allowed = ["DRAFT", "SENT"] as const;
    assert.equal(optionalEnum("DRAFT", allowed), "DRAFT");
    assert.equal(optionalEnum("'; DROP--", allowed), undefined);
  });
});

describe("parseOptionalDate", () => {
  it("restituisce undefined per date non valide", () => {
    assert.equal(parseOptionalDate("not-a-date"), undefined);
    assert.ok(parseOptionalDate("2026-06-05T10:00:00.000Z") instanceof Date);
  });
});

describe("buildOrContains", () => {
  it("non propaga wildcard nel filtro Prisma", () => {
    const or = buildOrContains("%admin%", ["email", "companyName"]);
    assert.ok(or);
    assert.equal(or![0].email.contains, "admin");
    assert.equal(or![1].companyName.contains, "admin");
  });
});
