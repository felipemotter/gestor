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
  | "statement";

export type TransactionType = "expense" | "income" | "transfer";

export const typeFilterAll = ["expense", "income", "transfer"] as const;
