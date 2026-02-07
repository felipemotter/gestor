import { describe, it, expect } from "vitest";
import { doesRuleMatch, findMatchingRule, applyRulesToBatch } from "../rule-matcher";
import type { Rule, RuleMatch } from "@/types";

// Helper to build a minimal Rule
function makeRule(overrides: Partial<Rule> & { match: RuleMatch }): Rule {
  return {
    id: "rule-1",
    family_id: "fam-1",
    name: "Test Rule",
    action: { set_category_id: "cat-1" },
    is_active: true,
    priority: 0,
    created_by: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("doesRuleMatch", () => {
  describe("description_contains", () => {
    it("matches case-insensitive substring", () => {
      const match: RuleMatch = { description_contains: "combustivel" };
      expect(doesRuleMatch(match, { memo: "POSTO IPIRANGA COMBUSTIVEL", amount: -310 })).toBe(true);
    });

    it("rejects when substring not found", () => {
      const match: RuleMatch = { description_contains: "farmacia" };
      expect(doesRuleMatch(match, { memo: "POSTO IPIRANGA", amount: -310 })).toBe(false);
    });

    it("uses original_description over memo", () => {
      const match: RuleMatch = { description_contains: "original" };
      expect(
        doesRuleMatch(match, {
          original_description: "ORIGINAL TEXT",
          memo: "something else",
          amount: 0,
        }),
      ).toBe(true);
    });
  });

  describe("description_regex", () => {
    it("matches regex pattern", () => {
      const match: RuleMatch = { description_regex: "^POSTO.*COMBUSTIVEL$" };
      expect(doesRuleMatch(match, { memo: "POSTO IPIRANGA COMBUSTIVEL", amount: -310 })).toBe(true);
    });

    it("is case-insensitive", () => {
      const match: RuleMatch = { description_regex: "posto" };
      expect(doesRuleMatch(match, { memo: "POSTO SHELL", amount: -50 })).toBe(true);
    });

    it("rejects non-matching regex", () => {
      const match: RuleMatch = { description_regex: "^FARMACIA" };
      expect(doesRuleMatch(match, { memo: "POSTO SHELL", amount: -50 })).toBe(false);
    });

    it("handles invalid regex gracefully (returns false)", () => {
      const match: RuleMatch = { description_regex: "[invalid(" };
      expect(doesRuleMatch(match, { memo: "anything", amount: 0 })).toBe(false);
    });
  });

  describe("amount_exact", () => {
    it("matches exact absolute amount", () => {
      const match: RuleMatch = { amount_exact: 310 };
      expect(doesRuleMatch(match, { amount: -310, memo: "" })).toBe(true);
    });

    it("allows tolerance within 0.009", () => {
      const match: RuleMatch = { amount_exact: 100 };
      expect(doesRuleMatch(match, { amount: -100.005, memo: "" })).toBe(true);
    });

    it("rejects amount outside tolerance", () => {
      const match: RuleMatch = { amount_exact: 100 };
      expect(doesRuleMatch(match, { amount: -101, memo: "" })).toBe(false);
    });
  });

  describe("amount_min / amount_max", () => {
    it("matches amount within range", () => {
      const match: RuleMatch = { amount_min: 100, amount_max: 500 };
      expect(doesRuleMatch(match, { amount: -250, memo: "" })).toBe(true);
    });

    it("rejects amount below min", () => {
      const match: RuleMatch = { amount_min: 100 };
      expect(doesRuleMatch(match, { amount: -50, memo: "" })).toBe(false);
    });

    it("rejects amount above max", () => {
      const match: RuleMatch = { amount_max: 100 };
      expect(doesRuleMatch(match, { amount: -150, memo: "" })).toBe(false);
    });
  });

  describe("day_of_month", () => {
    it("matches specific day", () => {
      const match: RuleMatch = { day_of_month: 15 };
      expect(doesRuleMatch(match, { amount: -100, memo: "", postedAt: "2025-01-15" })).toBe(true);
    });

    it("rejects different day", () => {
      const match: RuleMatch = { day_of_month: 15 };
      expect(doesRuleMatch(match, { amount: -100, memo: "", postedAt: "2025-01-20" })).toBe(false);
    });

    it("rejects when no date available", () => {
      const match: RuleMatch = { day_of_month: 15 };
      expect(doesRuleMatch(match, { amount: -100, memo: "" })).toBe(false);
    });
  });

  describe("date_after / date_before", () => {
    it("matches date within range (inclusive)", () => {
      const match: RuleMatch = { date_after: "2025-01-10", date_before: "2025-01-20" };
      expect(doesRuleMatch(match, { amount: -100, memo: "", postedAt: "2025-01-15" })).toBe(true);
    });

    it("matches boundary dates (inclusive)", () => {
      const match: RuleMatch = { date_after: "2025-01-10", date_before: "2025-01-10" };
      expect(doesRuleMatch(match, { amount: -100, memo: "", postedAt: "2025-01-10" })).toBe(true);
    });

    it("rejects date before range", () => {
      const match: RuleMatch = { date_after: "2025-01-10" };
      expect(doesRuleMatch(match, { amount: -100, memo: "", postedAt: "2025-01-05" })).toBe(false);
    });

    it("rejects date after range", () => {
      const match: RuleMatch = { date_before: "2025-01-10" };
      expect(doesRuleMatch(match, { amount: -100, memo: "", postedAt: "2025-01-15" })).toBe(false);
    });
  });

  describe("combined criteria", () => {
    it("all must match (AND logic)", () => {
      const match: RuleMatch = {
        description_contains: "combustivel",
        amount_min: 200,
        amount_max: 400,
      };
      expect(doesRuleMatch(match, { memo: "POSTO COMBUSTIVEL", amount: -310 })).toBe(true);
      expect(doesRuleMatch(match, { memo: "POSTO COMBUSTIVEL", amount: -100 })).toBe(false);
      expect(doesRuleMatch(match, { memo: "FARMACIA", amount: -310 })).toBe(false);
    });
  });

  describe("uses posted_at field as fallback", () => {
    it("reads from posted_at when postedAt is absent", () => {
      const match: RuleMatch = { day_of_month: 5 };
      expect(doesRuleMatch(match, { amount: 0, memo: "", posted_at: "2025-03-05" })).toBe(true);
    });
  });
});

describe("findMatchingRule", () => {
  it("returns first matching active rule", () => {
    const rules: Rule[] = [
      makeRule({ id: "r1", match: { description_contains: "xyz" } }),
      makeRule({
        id: "r2",
        match: { description_contains: "combustivel" },
        action: { set_category_id: "cat-fuel" },
      }),
    ];

    const result = findMatchingRule(rules, { memo: "POSTO COMBUSTIVEL", amount: -300 });
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe("r2");
    expect(result!.categoryId).toBe("cat-fuel");
  });

  it("skips inactive rules", () => {
    const rules: Rule[] = [
      makeRule({
        id: "r1",
        match: { description_contains: "combustivel" },
        is_active: false,
      }),
    ];

    const result = findMatchingRule(rules, { memo: "POSTO COMBUSTIVEL", amount: -300 });
    expect(result).toBeNull();
  });

  it("returns null when no rule matches", () => {
    const rules: Rule[] = [
      makeRule({ id: "r1", match: { description_contains: "farmacia" } }),
    ];

    const result = findMatchingRule(rules, { memo: "POSTO COMBUSTIVEL", amount: -300 });
    expect(result).toBeNull();
  });

  it("includes set_description when present", () => {
    const rules: Rule[] = [
      makeRule({
        id: "r1",
        match: { description_contains: "vivo" },
        action: { set_category_id: "cat-internet", set_description: "Internet Vivo" },
      }),
    ];

    const result = findMatchingRule(rules, { memo: "VIVO FIBRA INTERNET", amount: -129.9 });
    expect(result!.setDescription).toBe("Internet Vivo");
  });
});

describe("applyRulesToBatch", () => {
  it("sorts rules by priority then created_at", () => {
    const rules: Rule[] = [
      makeRule({
        id: "low-priority",
        match: { description_contains: "posto" },
        action: { set_category_id: "cat-general" },
        priority: 10,
        created_at: "2025-01-01T00:00:00Z",
      }),
      makeRule({
        id: "high-priority",
        match: { description_contains: "posto" },
        action: { set_category_id: "cat-fuel" },
        priority: 1,
        created_at: "2025-01-02T00:00:00Z",
      }),
    ];

    const txs = [{ memo: "POSTO SHELL", amount: -260 }];
    const results = applyRulesToBatch(rules, txs);

    expect(results.get(0)!.categoryId).toBe("cat-fuel");
  });

  it("breaks priority tie by created_at", () => {
    const rules: Rule[] = [
      makeRule({
        id: "newer",
        match: { description_contains: "posto" },
        action: { set_category_id: "cat-newer" },
        priority: 0,
        created_at: "2025-01-02T00:00:00Z",
      }),
      makeRule({
        id: "older",
        match: { description_contains: "posto" },
        action: { set_category_id: "cat-older" },
        priority: 0,
        created_at: "2025-01-01T00:00:00Z",
      }),
    ];

    const txs = [{ memo: "POSTO SHELL", amount: -260 }];
    const results = applyRulesToBatch(rules, txs);

    expect(results.get(0)!.categoryId).toBe("cat-older");
  });

  it("maps matched transaction indices", () => {
    const rules: Rule[] = [
      makeRule({
        id: "r1",
        match: { description_contains: "combustivel" },
        action: { set_category_id: "cat-fuel" },
      }),
    ];

    const txs = [
      { memo: "VIVO INTERNET", amount: -130 },
      { memo: "POSTO COMBUSTIVEL", amount: -310 },
      { memo: "PIX RECEBIDO", amount: 500 },
    ];

    const results = applyRulesToBatch(rules, txs);

    expect(results.size).toBe(1);
    expect(results.has(0)).toBe(false);
    expect(results.has(1)).toBe(true);
    expect(results.has(2)).toBe(false);
  });

  it("returns empty map when no rules match", () => {
    const rules: Rule[] = [
      makeRule({ id: "r1", match: { description_contains: "farmacia" } }),
    ];

    const txs = [{ memo: "POSTO SHELL", amount: -260 }];
    const results = applyRulesToBatch(rules, txs);

    expect(results.size).toBe(0);
  });
});
