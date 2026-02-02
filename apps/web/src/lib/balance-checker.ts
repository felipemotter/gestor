import { getSupabaseClient } from "@/lib/supabase/client";

export type BalanceDiscrepancy = {
  accountId: string;
  accountName: string;
  reconciledUntil: string;
  reconciledBalance: number;
  calculatedBalance: number;
  difference: number;
};

export async function checkAccountDiscrepancy(account: {
  id: string;
  name: string;
  reconciled_until: string | null;
  reconciled_balance: number | null;
}): Promise<BalanceDiscrepancy | null> {
  if (!account.reconciled_until || account.reconciled_balance == null) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("account_balance_at", {
    account_uuid: account.id,
    at_date: account.reconciled_until,
  });

  if (error || data == null) {
    return null;
  }

  const calculatedBalance = Number(data);
  const difference = calculatedBalance - account.reconciled_balance;

  if (Math.abs(difference) <= 0.01) {
    return null;
  }

  return {
    accountId: account.id,
    accountName: account.name,
    reconciledUntil: account.reconciled_until,
    reconciledBalance: account.reconciled_balance,
    calculatedBalance,
    difference,
  };
}
