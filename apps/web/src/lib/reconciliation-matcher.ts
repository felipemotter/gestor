import type {
  ReconciliationTransaction,
  ReconciliationMatch,
  ReconciliationCandidate,
  ReconciliationSettings,
} from "@/types";

function daysDiff(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T12:00:00Z");
  const b = new Date(dateB + "T12:00:00Z");
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86_400_000));
}

function amountsMatch(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(Math.abs(a) - Math.abs(b)) <= tolerance;
}

/**
 * Auto-match exact: same absolute amount (±0.01) AND same date.
 * Returns pre-selected matches and leftovers.
 */
export function autoMatchExact(
  manuals: ReconciliationTransaction[],
  ofxs: ReconciliationTransaction[],
): {
  exactMatches: ReconciliationMatch[];
  unmatchedManuals: ReconciliationTransaction[];
  unmatchedOfx: ReconciliationTransaction[];
} {
  const exactMatches: ReconciliationMatch[] = [];
  const usedManualIds = new Set<string>();
  const usedOfxIds = new Set<string>();

  for (const manual of manuals) {
    if (usedManualIds.has(manual.id)) continue;

    for (const ofx of ofxs) {
      if (usedOfxIds.has(ofx.id)) continue;

      if (
        amountsMatch(manual.amount, ofx.amount) &&
        daysDiff(manual.posted_at, ofx.posted_at) === 0
      ) {
        exactMatches.push({
          manual,
          ofx,
          matchScore: 100,
          matchReason: "Mesmo valor e mesma data",
          isExactMatch: true,
        });
        usedManualIds.add(manual.id);
        usedOfxIds.add(ofx.id);
        break;
      }
    }
  }

  const unmatchedManuals = manuals.filter((t) => !usedManualIds.has(t.id));
  const unmatchedOfx = ofxs.filter((t) => !usedOfxIds.has(t.id));

  return { exactMatches, unmatchedManuals, unmatchedOfx };
}

/**
 * Rank OFX candidates for a given manual transaction.
 * Uses family tolerances and per-transaction reconciliation hints.
 */
export function rankCandidates(
  manual: ReconciliationTransaction,
  ofxs: ReconciliationTransaction[],
  settings?: ReconciliationSettings | null,
  allowCrossAccount = true,
): ReconciliationCandidate[] {
  const dateTolerance = settings?.date_tolerance_days ?? 3;
  const amountToleranceAbs = settings?.amount_tolerance_abs ?? 1.0;
  const descriptionMatching = settings?.description_matching ?? false;
  const hint = manual.reconciliation_hint;

  const candidates: ReconciliationCandidate[] = [];

  for (const ofx of ofxs) {
    let score = 0;
    const reasons: string[] = [];

    // Date proximity scoring
    const days = daysDiff(manual.posted_at, ofx.posted_at);
    if (days > dateTolerance) continue;

    if (days === 0) {
      score += 40;
      reasons.push("mesma data");
    } else if (days === 1) {
      score += 30;
      reasons.push("data ±1 dia");
    } else if (days <= 2) {
      score += 20;
      reasons.push(`data ±${days} dias`);
    } else {
      score += 10;
      reasons.push(`data ±${days} dias`);
    }

    // Amount proximity scoring
    const amountDiff = Math.abs(Math.abs(manual.amount) - Math.abs(ofx.amount));
    if (amountDiff <= 0.01) {
      score += 40;
      reasons.push("mesmo valor");
    } else if (amountDiff <= amountToleranceAbs) {
      score += 25;
      reasons.push(`valor ±${amountDiff.toFixed(2)}`);
    } else {
      // Too far on amount, skip
      continue;
    }

    // Hint bonuses
    if (hint) {
      const ofxDesc = (
        ofx.description ||
        ofx.original_description ||
        ""
      ).toLowerCase();

      if (hint.match_description && ofxDesc.includes(hint.match_description.toLowerCase())) {
        score += 15;
        reasons.push("descricao hint");
      }

      if (hint.match_amount_min != null && hint.match_amount_max != null) {
        const absAmount = Math.abs(ofx.amount);
        if (absAmount >= hint.match_amount_min && absAmount <= hint.match_amount_max) {
          score += 10;
          reasons.push("faixa de valor hint");
        }
      }
    }

    // Description similarity bonus (optional)
    if (descriptionMatching) {
      const manualDesc = (manual.description || "").toLowerCase();
      const ofxDesc = (
        ofx.description ||
        ofx.original_description ||
        ""
      ).toLowerCase();
      if (manualDesc.length > 2 && ofxDesc.includes(manualDesc)) {
        score += 10;
        reasons.push("descricao similar");
      }
    }

    // Cross-account penalty
    if (manual.account_id && ofx.account_id && manual.account_id !== ofx.account_id) {
      if (!allowCrossAccount) continue;
      score -= 20;
      reasons.push("conta diferente");
    }

    if (score >= 40) {
      candidates.push({
        ofx,
        score,
        reason: reasons.join(", "),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}
