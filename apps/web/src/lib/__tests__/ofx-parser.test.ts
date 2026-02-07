import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseOFX } from "../ofx-parser";

const fixturesDir = resolve(__dirname, "../__fixtures__");

function loadFixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), "utf-8");
}

describe("parseOFX — Nubank fixture", () => {
  it("parses bank metadata", async () => {
    const content = loadFixture("nubank.ofx");
    const result = await parseOFX(content);

    expect(result.bankName).toBe("Nu Pagamentos");
    expect(result.bankId).toBe("0260");
    expect(result.accountId).toBe("123456-7");
    expect(result.currency).toBe("BRL");
  });

  it("parses date range", async () => {
    const content = loadFixture("nubank.ofx");
    const result = await parseOFX(content);

    expect(result.startDate).toBe("2025-01-01");
    expect(result.endDate).toBe("2025-01-31");
  });

  it("parses ledger balance", async () => {
    const content = loadFixture("nubank.ofx");
    const result = await parseOFX(content);

    expect(result.ledgerBalance).toBe(4857.10);
  });

  it("parses all transactions", async () => {
    const content = loadFixture("nubank.ofx");
    const result = await parseOFX(content);

    expect(result.transactions).toHaveLength(8);
  });

  it("parses debit transaction correctly", async () => {
    const content = loadFixture("nubank.ofx");
    const result = await parseOFX(content);

    const first = result.transactions[0];
    expect(first.fitId).toBe("NU20250106001");
    expect(first.type).toBe("DEBIT");
    expect(first.postedAt).toBe("2025-01-06");
    expect(first.amount).toBe(-310);
    expect(first.memo).toBe("POSTO IPIRANGA COMBUSTIVEL");
  });

  it("parses credit transaction correctly", async () => {
    const content = loadFixture("nubank.ofx");
    const result = await parseOFX(content);

    const credit = result.transactions.find((t) => t.fitId === "NU20250115001");
    expect(credit).toBeDefined();
    expect(credit!.type).toBe("CREDIT");
    expect(credit!.amount).toBe(1500);
    expect(credit!.memo).toBe("TED RECEBIDO - PROJETO FREELANCE");
  });

  it("generates unique hashes per transaction", async () => {
    const content = loadFixture("nubank.ofx");
    const result = await parseOFX(content);

    const hashes = result.transactions.map((t) => t.hash);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(hashes.length);
  });
});

describe("parseOFX — Viacredi fixture", () => {
  it("parses bank metadata", async () => {
    const content = loadFixture("viacredi.ofx");
    const result = await parseOFX(content);

    expect(result.bankName).toBe("Viacredi");
    expect(result.bankId).toBe("0756");
    expect(result.accountId).toBe("98765-0");
  });

  it("parses ledger balance", async () => {
    const content = loadFixture("viacredi.ofx");
    const result = await parseOFX(content);

    expect(result.ledgerBalance).toBe(8944.05);
  });

  it("parses 6 transactions", async () => {
    const content = loadFixture("viacredi.ofx");
    const result = await parseOFX(content);

    expect(result.transactions).toHaveLength(6);
  });

  it("handles small decimal amounts", async () => {
    const content = loadFixture("viacredi.ofx");
    const result = await parseOFX(content);

    const iof = result.transactions.find((t) => t.fitId === "VC20250128001");
    expect(iof).toBeDefined();
    expect(iof!.amount).toBe(-3.45);
  });
});

describe("parseOFX — error handling", () => {
  it("throws on empty/invalid content", async () => {
    await expect(parseOFX("")).rejects.toThrow();
  });

  it("throws on random text", async () => {
    await expect(parseOFX("this is not an OFX file")).rejects.toThrow();
  });
});
