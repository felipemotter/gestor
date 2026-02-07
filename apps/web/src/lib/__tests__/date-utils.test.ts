import { describe, it, expect } from "vitest";
import {
  getDateParts,
  formatDateKey,
  parseBrazilDate,
  addDaysToBrazilDate,
  subtractDaysFromBrazilDate,
  isDateOnly,
  toBrazilDateKey,
  getMonthRange,
} from "../date-utils";

describe("getDateParts", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    expect(getDateParts("2025-03-15")).toEqual({
      year: 2025,
      monthIndex: 2,
      day: 15,
    });
  });

  it("returns null for incomplete string", () => {
    expect(getDateParts("2025-03")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getDateParts("")).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(getDateParts("abc-de-fg")).toBeNull();
  });
});

describe("formatDateKey", () => {
  it("formats parts into YYYY-MM-DD", () => {
    expect(formatDateKey(2025, 0, 1)).toBe("2025-01-01");
  });

  it("zero-pads month and day", () => {
    expect(formatDateKey(2025, 2, 5)).toBe("2025-03-05");
  });

  it("handles December", () => {
    expect(formatDateKey(2025, 11, 31)).toBe("2025-12-31");
  });
});

describe("parseBrazilDate", () => {
  it("returns Date at UTC noon for valid YYYY-MM-DD", () => {
    const d = parseBrazilDate("2025-06-15");
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(5);
    expect(d.getUTCDate()).toBe(15);
    expect(d.getUTCHours()).toBe(12);
  });

  it("returns current date for invalid input", () => {
    const before = Date.now();
    const d = parseBrazilDate("invalid");
    const after = Date.now();
    expect(d.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(d.getTime()).toBeLessThanOrEqual(after + 1000);
  });
});

describe("addDaysToBrazilDate", () => {
  it("adds days to a date string", () => {
    const result = addDaysToBrazilDate("2025-01-30", 3);
    expect(result).toBe("2025-02-02");
  });

  it("handles month boundary", () => {
    const result = addDaysToBrazilDate("2025-02-28", 1);
    expect(result).toBe("2025-03-01");
  });
});

describe("subtractDaysFromBrazilDate", () => {
  it("subtracts days from a date string", () => {
    const result = subtractDaysFromBrazilDate("2025-03-01", 1);
    expect(result).toBe("2025-02-28");
  });
});

describe("isDateOnly", () => {
  it("returns true for YYYY-MM-DD", () => {
    expect(isDateOnly("2025-01-15")).toBe(true);
  });

  it("returns false for datetime", () => {
    expect(isDateOnly("2025-01-15T10:00:00Z")).toBe(false);
  });

  it("returns false for incomplete date", () => {
    expect(isDateOnly("2025-01")).toBe(false);
  });
});

describe("toBrazilDateKey", () => {
  it("returns date-only string as-is", () => {
    expect(toBrazilDateKey("2025-06-15")).toBe("2025-06-15");
  });

  it("converts ISO datetime to Brazil date key", () => {
    // Noon UTC is 9am Sao Paulo — same day
    const result = toBrazilDateKey("2025-06-15T12:00:00Z");
    expect(result).toBe("2025-06-15");
  });

  it("returns invalid string as-is", () => {
    expect(toBrazilDateKey("not-a-date")).toBe("not-a-date");
  });
});

describe("getMonthRange", () => {
  it("returns start and end for January", () => {
    expect(getMonthRange("2025-01")).toEqual({
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
  });

  it("handles February non-leap year", () => {
    expect(getMonthRange("2025-02")).toEqual({
      startDate: "2025-02-01",
      endDate: "2025-02-28",
    });
  });

  it("handles February leap year", () => {
    expect(getMonthRange("2024-02")).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });

  it("returns empty strings for invalid input", () => {
    expect(getMonthRange("invalid")).toEqual({
      startDate: "",
      endDate: "",
    });
  });
});
