import type React from "react";

export type DashboardCategoryDatum = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type DashboardCashflowPoint = {
  date: string;
  value: number;
};

export type StatementRow = {
  id: string;
  posted_at: string;
  occurred_time: string | null;
  description: string | null;
  label: string;
  delta: number;
  balance_after: number;
};

export type AccountIconOption = {
  key: string;
  label: string;
  icon?: ({ className }: { className?: string }) => React.ReactNode;
  imageSrc?: string;
};

export type ActiveView =
  | "dashboard"
  | "transactions"
  | "transfers"
  | "accounts"
  | "categories"
  | "statement"
  | "imports"
  | "reconciliation"
  | "rules";

export type ReconciliationSettings = {
  amount_tolerance_abs?: number | null;
  amount_tolerance_pct?: number | null;
  date_tolerance_days?: number | null;
  description_matching?: boolean;
};

export type ReconciliationHint = {
  match_description?: string;
  match_amount_min?: number;
  match_amount_max?: number;
};

export type ReconciliationTransaction = {
  id: string;
  amount: number;
  description: string | null;
  original_description: string | null;
  posted_at: string;
  source: string | null;
  external_id: string | null;
  category_id: string | null;
  category_name: string | null;
  category_type: string | null;
  account_id?: string;
  account_name?: string;
  reconciliation_hint?: ReconciliationHint | null;
};

export type ReconciliationMatch = {
  manual: ReconciliationTransaction;
  ofx: ReconciliationTransaction;
  matchScore: number;
  matchReason: string;
  isExactMatch: boolean;
};

export type ReconciliationCandidate = {
  ofx: ReconciliationTransaction;
  score: number;
  reason: string;
};

export type RuleMatch = {
  description_contains?: string;
  description_regex?: string;
  amount_min?: number;
  amount_max?: number;
  amount_exact?: number;
  day_of_month?: number;
  date_after?: string;
  date_before?: string;
};

export type RuleAction = {
  set_category_id: string;
  set_description?: string;
};

export type Rule = {
  id: string;
  family_id: string;
  name: string;
  match: RuleMatch;
  action: RuleAction;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
};

export type TransactionType = "expense" | "income" | "transfer";

export const typeFilterAll = ["expense", "income", "transfer"] as const;
