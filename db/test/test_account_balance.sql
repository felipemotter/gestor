-- Test: account_balance() and account_balance_at()
SET session_replication_role = 'replica';  -- bypass RLS and triggers

DO $$
DECLARE
  fam_id uuid;
  acct_id uuid;
  bal numeric;
BEGIN
  -- Setup: create family + account
  INSERT INTO public.families (id, name) VALUES (gen_random_uuid(), 'Test Family')
    RETURNING id INTO fam_id;

  INSERT INTO public.accounts (id, family_id, name, opening_balance)
    VALUES (gen_random_uuid(), fam_id, 'Test Account', 1000.00)
    RETURNING id INTO acct_id;

  -- Test 1: balance with no transactions = opening_balance
  SELECT public.account_balance(acct_id) INTO bal;
  IF bal <> 1000.00 THEN
    RAISE EXCEPTION 'FAIL: account_balance with no transactions: expected 1000.00, got %', bal;
  END IF;

  -- Add transactions
  INSERT INTO public.transactions (account_id, amount, posted_at, source)
    VALUES (acct_id, -300.00, '2025-01-10', 'manual');
  INSERT INTO public.transactions (account_id, amount, posted_at, source)
    VALUES (acct_id, 500.00, '2025-01-15', 'manual');
  INSERT INTO public.transactions (account_id, amount, posted_at, source)
    VALUES (acct_id, -100.00, '2025-01-20', 'manual');

  -- Test 2: account_balance = 1000 + (-300) + 500 + (-100) = 1100
  SELECT public.account_balance(acct_id) INTO bal;
  IF bal <> 1100.00 THEN
    RAISE EXCEPTION 'FAIL: account_balance after transactions: expected 1100.00, got %', bal;
  END IF;

  -- Test 3: account_balance_at before any transaction = opening_balance
  SELECT public.account_balance_at(acct_id, '2025-01-01') INTO bal;
  IF bal <> 1000.00 THEN
    RAISE EXCEPTION 'FAIL: account_balance_at(01-01) expected 1000.00, got %', bal;
  END IF;

  -- Test 4: account_balance_at at 2025-01-10 = 1000 + (-300) = 700
  SELECT public.account_balance_at(acct_id, '2025-01-10') INTO bal;
  IF bal <> 700.00 THEN
    RAISE EXCEPTION 'FAIL: account_balance_at(01-10) expected 700.00, got %', bal;
  END IF;

  -- Test 5: account_balance_at at 2025-01-15 = 1000 + (-300) + 500 = 1200
  SELECT public.account_balance_at(acct_id, '2025-01-15') INTO bal;
  IF bal <> 1200.00 THEN
    RAISE EXCEPTION 'FAIL: account_balance_at(01-15) expected 1200.00, got %', bal;
  END IF;

  -- Test 6: account_balance_at at end = same as account_balance
  SELECT public.account_balance_at(acct_id, '2025-12-31') INTO bal;
  IF bal <> 1100.00 THEN
    RAISE EXCEPTION 'FAIL: account_balance_at(12-31) expected 1100.00, got %', bal;
  END IF;

  -- Test 7: account_balance for nonexistent account returns NULL
  SELECT public.account_balance('00000000-0000-0000-0000-000000000000') INTO bal;
  IF bal IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: account_balance for nonexistent expected NULL, got %', bal;
  END IF;

  -- Cleanup
  DELETE FROM public.transactions WHERE account_id = acct_id;
  DELETE FROM public.accounts WHERE id = acct_id;
  DELETE FROM public.families WHERE id = fam_id;

  RAISE NOTICE 'All account_balance tests passed';
END;
$$;

RESET session_replication_role;
