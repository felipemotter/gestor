-- Test: RPC functions (unreconciled_manual_transactions, uncategorized_ofx_count, unreconciled_manual_count)
-- These functions use auth.uid() so we test the core logic with service_role bypass.
SET session_replication_role = 'replica';

DO $$
DECLARE
  fam_id uuid;
  acct_id uuid;
  acct_norec uuid;
  cat_id uuid;
  cnt bigint;
  rec_count bigint;
BEGIN
  -- Setup
  INSERT INTO public.families (id, name) VALUES (gen_random_uuid(), 'RPC Test Family')
    RETURNING id INTO fam_id;

  -- Reconcilable account with reconciled_until set
  INSERT INTO public.accounts (id, family_id, name, is_reconcilable, reconciled_until, reconciled_balance)
    VALUES (gen_random_uuid(), fam_id, 'Reconcilable Acct', true, '2025-01-31', 5000.00)
    RETURNING id INTO acct_id;

  -- Non-reconcilable account
  INSERT INTO public.accounts (id, family_id, name, is_reconcilable)
    VALUES (gen_random_uuid(), fam_id, 'Normal Acct', false)
    RETURNING id INTO acct_norec;

  INSERT INTO public.categories (id, family_id, name, category_type)
    VALUES (gen_random_uuid(), fam_id, 'Alimentação', 'expense')
    RETURNING id INTO cat_id;

  -- OFX transactions on reconcilable account (needed to establish min OFX date range)
  INSERT INTO public.transactions (account_id, amount, posted_at, source, external_id)
    VALUES (acct_id, -100.00, '2025-01-05', 'ofx', 'OFX001');
  INSERT INTO public.transactions (account_id, amount, posted_at, source, external_id, category_id)
    VALUES (acct_id, -200.00, '2025-01-10', 'ofx', 'OFX002', cat_id);
  -- OFX without category (should count for uncategorized)
  INSERT INTO public.transactions (account_id, amount, posted_at, source, external_id)
    VALUES (acct_id, -50.00, '2025-01-15', 'ofx', 'OFX003');

  -- Manual transactions on reconcilable account within reconciled period
  INSERT INTO public.transactions (account_id, amount, posted_at, source)
    VALUES (acct_id, -80.00, '2025-01-12', 'manual');
  INSERT INTO public.transactions (account_id, amount, posted_at, source)
    VALUES (acct_id, -120.00, '2025-01-20', 'manual');

  -- Manual transaction AFTER reconciled_until (should NOT be counted)
  INSERT INTO public.transactions (account_id, amount, posted_at, source)
    VALUES (acct_id, -999.00, '2025-02-15', 'manual');

  -- OFX on non-reconcilable account without category
  INSERT INTO public.transactions (account_id, amount, posted_at, source, external_id)
    VALUES (acct_norec, -30.00, '2025-01-10', 'ofx', 'OFX-NR-001');

  -- ==== Test 1: uncategorized_ofx_count ====
  -- acct_id has 2 uncategorized OFX (OFX001, OFX003), acct_norec has 1 = 3 total
  -- But function uses auth.uid() for visibility filter. With replica mode,
  -- visibility check is bypassed. Let's test the count logic.
  SELECT public.uncategorized_ofx_count(fam_id) INTO cnt;
  IF cnt <> 3 THEN
    RAISE EXCEPTION 'FAIL: uncategorized_ofx_count expected 3, got %', cnt;
  END IF;

  -- ==== Test 2: unreconciled_manual_count ====
  -- 2 manual transactions within reconciled period (01-12 and 01-20)
  -- 01-12 is >= min OFX date (01-05) and <= reconciled_until (01-31) ✓
  -- 01-20 is >= min OFX date (01-05) and <= reconciled_until (01-31) ✓
  -- 02-15 is > reconciled_until → excluded
  SELECT public.unreconciled_manual_count(fam_id) INTO cnt;
  IF cnt <> 2 THEN
    RAISE EXCEPTION 'FAIL: unreconciled_manual_count expected 2, got %', cnt;
  END IF;

  -- ==== Test 3: unreconciled_manual_transactions returns correct rows ====
  SELECT count(*) INTO rec_count
    FROM public.unreconciled_manual_transactions(fam_id);
  IF rec_count <> 2 THEN
    RAISE EXCEPTION 'FAIL: unreconciled_manual_transactions expected 2 rows, got %', rec_count;
  END IF;

  -- Cleanup
  DELETE FROM public.transactions WHERE account_id IN (acct_id, acct_norec);
  DELETE FROM public.categories WHERE id = cat_id;
  DELETE FROM public.accounts WHERE id IN (acct_id, acct_norec);
  DELETE FROM public.families WHERE id = fam_id;

  RAISE NOTICE 'All RPC tests passed';
END;
$$;

RESET session_replication_role;
