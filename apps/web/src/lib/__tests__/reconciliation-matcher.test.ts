import { describe, it, expect } from "vitest";
import { autoMatchExact, rankCandidates } from "../reconciliation-matcher";
import type { ReconciliationTransaction, ReconciliationSettings } from "@/types";

function makeTx(overrides: Partial<ReconciliationTransaction>): ReconciliationTransaction {
  return {
    id: "tx-1",
    amount: -100,
    description: null,
    original_description: null,
    posted_at: "2025-01-15",
    source: "manual",
    external_id: null,
    category_id: null,
    category_name: null,
    category_type: null,
    ...overrides,
  };
}

describe("autoMatchExact", () => {
  it("matches same absolute amount and same date", () => {
    const manuals = [makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" })];
    const ofxs = [makeTx({ id: "o1", amount: -100, posted_at: "2025-01-15", source: "ofx" })];

    const { exactMatches, unmatchedManuals, unmatchedOfx } = autoMatchExact(manuals, ofxs);

    expect(exactMatches).toHaveLength(1);
    expect(exactMatches[0].manual.id).toBe("m1");
    expect(exactMatches[0].ofx.id).toBe("o1");
    expect(exactMatches[0].matchScore).toBe(100);
    expect(exactMatches[0].isExactMatch).toBe(true);
    expect(unmatchedManuals).toHaveLength(0);
    expect(unmatchedOfx).toHaveLength(0);
  });

  it("matches with tolerance of 0.01 (small difference)", () => {
    const manuals = [makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" })];
    const ofxs = [makeTx({ id: "o1", amount: -100.005, posted_at: "2025-01-15", source: "ofx" })];

    const { exactMatches } = autoMatchExact(manuals, ofxs);
    expect(exactMatches).toHaveLength(1);
  });

  it("does not match different dates", () => {
    const manuals = [makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" })];
    const ofxs = [makeTx({ id: "o1", amount: -100, posted_at: "2025-01-16", source: "ofx" })];

    const { exactMatches, unmatchedManuals, unmatchedOfx } = autoMatchExact(manuals, ofxs);
    expect(exactMatches).toHaveLength(0);
    expect(unmatchedManuals).toHaveLength(1);
    expect(unmatchedOfx).toHaveLength(1);
  });

  it("does not match different amounts beyond tolerance", () => {
    const manuals = [makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" })];
    const ofxs = [makeTx({ id: "o1", amount: -105, posted_at: "2025-01-15", source: "ofx" })];

    const { exactMatches } = autoMatchExact(manuals, ofxs);
    expect(exactMatches).toHaveLength(0);
  });

  it("enforces 1:1 matching (no double-match)", () => {
    const manuals = [
      makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" }),
      makeTx({ id: "m2", amount: -100, posted_at: "2025-01-15" }),
    ];
    const ofxs = [makeTx({ id: "o1", amount: -100, posted_at: "2025-01-15", source: "ofx" })];

    const { exactMatches, unmatchedManuals } = autoMatchExact(manuals, ofxs);
    expect(exactMatches).toHaveLength(1);
    expect(unmatchedManuals).toHaveLength(1);
  });

  it("returns all as unmatched when no matches", () => {
    const manuals = [makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" })];
    const ofxs = [makeTx({ id: "o1", amount: -200, posted_at: "2025-01-20", source: "ofx" })];

    const { exactMatches, unmatchedManuals, unmatchedOfx } = autoMatchExact(manuals, ofxs);
    expect(exactMatches).toHaveLength(0);
    expect(unmatchedManuals).toHaveLength(1);
    expect(unmatchedOfx).toHaveLength(1);
  });

  it("handles empty arrays", () => {
    const { exactMatches, unmatchedManuals, unmatchedOfx } = autoMatchExact([], []);
    expect(exactMatches).toHaveLength(0);
    expect(unmatchedManuals).toHaveLength(0);
    expect(unmatchedOfx).toHaveLength(0);
  });
});

describe("rankCandidates", () => {
  const defaultSettings: ReconciliationSettings = {
    date_tolerance_days: 3,
    amount_tolerance_abs: 1.0,
    description_matching: false,
  };

  it("scores highest for same date + same amount", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-15", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(80); // 40 (date) + 40 (amount)
  });

  it("scores lower for ±1 day difference", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-16", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(70); // 30 (date ±1) + 40 (amount)
  });

  it("scores lower for ±2 day difference", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-17", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(60); // 20 (date ±2) + 40 (amount)
  });

  it("scores lower for ±3 day difference", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-18", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(50); // 10 (date ±3) + 40 (amount)
  });

  it("excludes candidates beyond date tolerance", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-25", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(0);
  });

  it("accepts amount within tolerance, lower score", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100.50, posted_at: "2025-01-15", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(65); // 40 (date) + 25 (amount within tolerance)
  });

  it("excludes candidates beyond amount tolerance", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -105, posted_at: "2025-01-15", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(0);
  });

  it("adds hint bonus for description match", () => {
    const manual = makeTx({
      id: "m1",
      amount: -100,
      posted_at: "2025-01-15",
      reconciliation_hint: { match_description: "combustivel" },
    });
    const ofxs = [
      makeTx({
        id: "o1",
        amount: -100,
        posted_at: "2025-01-15",
        source: "ofx",
        original_description: "POSTO COMBUSTIVEL",
      }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(95); // 40 + 40 + 15 (hint desc)
  });

  it("adds hint bonus for amount range match", () => {
    const manual = makeTx({
      id: "m1",
      amount: -100,
      posted_at: "2025-01-15",
      reconciliation_hint: { match_amount_min: 90, match_amount_max: 110 },
    });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-15", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(90); // 40 + 40 + 10 (hint amount)
  });

  it("adds description similarity bonus when enabled", () => {
    const settings: ReconciliationSettings = {
      ...defaultSettings,
      description_matching: true,
    };
    const manual = makeTx({
      id: "m1",
      amount: -100,
      posted_at: "2025-01-15",
      description: "combustivel",
    });
    const ofxs = [
      makeTx({
        id: "o1",
        amount: -100,
        posted_at: "2025-01-15",
        source: "ofx",
        description: "POSTO COMBUSTIVEL",
      }),
    ];

    const candidates = rankCandidates(manual, ofxs, settings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(90); // 40 + 40 + 10 (desc similarity)
  });

  it("applies cross-account penalty", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15", account_id: "acct-A" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-15", source: "ofx", account_id: "acct-B" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings, true);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(60); // 80 - 20 penalty
  });

  it("excludes cross-account when not allowed", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15", account_id: "acct-A" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-15", source: "ofx", account_id: "acct-B" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings, false);
    expect(candidates).toHaveLength(0);
  });

  it("enforces minimum score of 40", () => {
    // date ±3 days = 10, amount within tolerance = 25 → total 35 < 40
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100.50, posted_at: "2025-01-18", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    // score = 10 + 25 = 35 → filtered out
    expect(candidates).toHaveLength(0);
  });

  it("sorts candidates by score descending", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-17", source: "ofx" }), // score=60
      makeTx({ id: "o2", amount: -100, posted_at: "2025-01-15", source: "ofx" }), // score=80
      makeTx({ id: "o3", amount: -100, posted_at: "2025-01-16", source: "ofx" }), // score=70
    ];

    const candidates = rankCandidates(manual, ofxs, defaultSettings);
    expect(candidates).toHaveLength(3);
    expect(candidates[0].ofx.id).toBe("o2");
    expect(candidates[1].ofx.id).toBe("o3");
    expect(candidates[2].ofx.id).toBe("o1");
  });

  it("uses default tolerances when settings is null", () => {
    const manual = makeTx({ id: "m1", amount: -100, posted_at: "2025-01-15" });
    const ofxs = [
      makeTx({ id: "o1", amount: -100, posted_at: "2025-01-15", source: "ofx" }),
    ];

    const candidates = rankCandidates(manual, ofxs, null);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].score).toBe(80);
  });
});
