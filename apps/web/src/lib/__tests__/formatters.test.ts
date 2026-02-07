import { describe, it, expect } from "vitest";
import {
  currencyFormatter,
  formatCompactCurrency,
  formatCompactBRL,
  shortDateFormatter,
} from "../formatters";

describe("currencyFormatter", () => {
  it("formats positive BRL", () => {
    const result = currencyFormatter.format(1234.56);
    expect(result).toContain("1.234,56");
    expect(result).toContain("R$");
  });

  it("formats zero", () => {
    const result = currencyFormatter.format(0);
    expect(result).toContain("0,00");
  });

  it("formats negative BRL", () => {
    const result = currencyFormatter.format(-50.1);
    expect(result).toContain("50,10");
  });
});

describe("formatCompactCurrency", () => {
  it("formats with R$ prefix and space", () => {
    const result = formatCompactCurrency(1234.56);
    expect(result).toBe("R$ 1.234,56");
  });

  it("strips any non-breaking space between R$ and value", () => {
    const result = formatCompactCurrency(100);
    // Should have exactly one normal space after R$
    expect(result).toMatch(/^R\$ \d/);
  });
});

describe("formatCompactBRL", () => {
  it("formats thousands with k suffix", () => {
    const result = formatCompactBRL(1500);
    expect(result).toBe("R$ 1,5k");
  });

  it("formats millions with M suffix", () => {
    const result = formatCompactBRL(2500000);
    expect(result).toBe("R$ 2,5M");
  });

  it("formats billions with B suffix", () => {
    const result = formatCompactBRL(1200000000);
    expect(result).toBe("R$ 1,2B");
  });

  it("formats values under 1000 without suffix", () => {
    const result = formatCompactBRL(750);
    expect(result).toContain("R$");
    expect(result).toContain("750");
    expect(result).not.toMatch(/[kMB]/);
  });

  it("handles negative values", () => {
    const result = formatCompactBRL(-3500);
    expect(result).toBe("-R$ 3,5k");
  });

  it("handles zero", () => {
    const result = formatCompactBRL(0);
    expect(result).toContain("R$");
    expect(result).toContain("0");
  });
});

describe("shortDateFormatter", () => {
  it("formats a Date in pt-BR dd/mm/yyyy format", () => {
    // Use UTC noon to ensure consistent Brazil timezone behavior
    const date = new Date("2025-06-15T12:00:00Z");
    const result = shortDateFormatter.format(date);
    expect(result).toBe("15/06/2025");
  });
});
