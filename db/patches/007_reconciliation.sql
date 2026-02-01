-- 007: Reconciliation support
-- Add reconciliation columns to accounts and trigger to protect reconciled period

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_reconcilable boolean NOT NULL DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS reconciled_until date;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS reconciled_balance numeric(14,2);

-- Backfill: mark accounts that already have OFX imports as reconcilable
UPDATE public.accounts
SET is_reconcilable = true
WHERE id IN (SELECT DISTINCT account_id FROM public.transactions WHERE source = 'ofx')
  AND is_reconcilable = false;

-- Trigger: block manual transactions in reconciled period (non-admin only)
CREATE OR REPLACE FUNCTION public.enforce_reconciled_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct_reconciled_until date;
  acct_family_id uuid;
BEGIN
  -- Only check non-OFX sources
  IF coalesce(new.source, '') = 'ofx' THEN
    RETURN new;
  END IF;

  SELECT reconciled_until, family_id
    INTO acct_reconciled_until, acct_family_id
    FROM public.accounts
    WHERE id = new.account_id;

  -- No reconciled period → allow
  IF acct_reconciled_until IS NULL THEN
    RETURN new;
  END IF;

  -- Transaction date is after reconciled period → allow
  IF new.posted_at > acct_reconciled_until THEN
    RETURN new;
  END IF;

  -- Admin/owner can override
  IF public.is_family_admin(acct_family_id) THEN
    RETURN new;
  END IF;

  RAISE EXCEPTION 'Periodo reconciliado ate %. Lancamentos manuais neste periodo exigem permissao de administrador.', acct_reconciled_until;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_reconciled_period ON public.transactions;
CREATE TRIGGER trg_transactions_reconciled_period
BEFORE INSERT OR UPDATE OF posted_at, source ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_reconciled_period();
