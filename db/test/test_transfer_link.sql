-- Test: link_transfer(), unlink_transfer(), migrate_transfer_link(), validate_transfer_link()
SET session_replication_role = 'replica';  -- bypass RLS and triggers

DO $$
DECLARE
  fam_id uuid;
  acct_a uuid;
  acct_b uuid;
  cat_id uuid;
  tx_a uuid;
  tx_b uuid;
  tx_c uuid;
  linked uuid;
BEGIN
  -- Setup
  INSERT INTO public.families (id, name) VALUES (gen_random_uuid(), 'Transfer Test Family')
    RETURNING id INTO fam_id;
  INSERT INTO public.accounts (id, family_id, name) VALUES (gen_random_uuid(), fam_id, 'Account A')
    RETURNING id INTO acct_a;
  INSERT INTO public.accounts (id, family_id, name) VALUES (gen_random_uuid(), fam_id, 'Account B')
    RETURNING id INTO acct_b;
  INSERT INTO public.categories (id, family_id, name, category_type) VALUES (gen_random_uuid(), fam_id, 'Transferência', 'transfer')
    RETURNING id INTO cat_id;

  -- Create two opposite transactions
  INSERT INTO public.transactions (id, account_id, amount, posted_at, source)
    VALUES (gen_random_uuid(), acct_a, -500.00, '2025-01-15', 'manual')
    RETURNING id INTO tx_a;
  INSERT INTO public.transactions (id, account_id, amount, posted_at, source)
    VALUES (gen_random_uuid(), acct_b, 500.00, '2025-01-15', 'manual')
    RETURNING id INTO tx_b;

  -- Test 1: link_transfer sets bidirectional links and category
  PERFORM public.link_transfer(tx_a, tx_b, cat_id);

  SELECT transfer_linked_id INTO linked FROM public.transactions WHERE id = tx_a;
  IF linked <> tx_b THEN
    RAISE EXCEPTION 'FAIL: link_transfer: tx_a.transfer_linked_id expected %, got %', tx_b, linked;
  END IF;

  SELECT transfer_linked_id INTO linked FROM public.transactions WHERE id = tx_b;
  IF linked <> tx_a THEN
    RAISE EXCEPTION 'FAIL: link_transfer: tx_b.transfer_linked_id expected %, got %', tx_a, linked;
  END IF;

  -- Verify category was set
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = tx_a AND category_id = cat_id) THEN
    RAISE EXCEPTION 'FAIL: link_transfer: tx_a category not set';
  END IF;

  -- Test 2: unlink_transfer clears both sides
  PERFORM public.unlink_transfer(tx_a);

  SELECT transfer_linked_id INTO linked FROM public.transactions WHERE id = tx_a;
  IF linked IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: unlink_transfer: tx_a.transfer_linked_id expected NULL, got %', linked;
  END IF;

  SELECT transfer_linked_id INTO linked FROM public.transactions WHERE id = tx_b;
  IF linked IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: unlink_transfer: tx_b.transfer_linked_id expected NULL, got %', linked;
  END IF;

  -- Verify category was cleared
  IF EXISTS (SELECT 1 FROM public.transactions WHERE id = tx_a AND category_id IS NOT NULL) THEN
    RAISE EXCEPTION 'FAIL: unlink_transfer: tx_a category not cleared';
  END IF;

  -- Test 3: unlink_transfer on unlinked tx is a no-op
  PERFORM public.unlink_transfer(tx_a);
  -- No error = pass

  -- Test 4: migrate_transfer_link
  -- Re-link first
  PERFORM public.link_transfer(tx_a, tx_b, cat_id);

  -- Create new OFX transaction
  INSERT INTO public.transactions (id, account_id, amount, posted_at, source)
    VALUES (gen_random_uuid(), acct_a, -500.00, '2025-01-15', 'ofx')
    RETURNING id INTO tx_c;

  -- Unlink old, then migrate: tx_b should now point to tx_c
  -- First unlink the old pair
  PERFORM public.unlink_transfer(tx_a);
  -- Now migrate: link tx_b (old partner) to tx_c (new OFX)
  PERFORM public.migrate_transfer_link(tx_b, tx_c, cat_id);

  SELECT transfer_linked_id INTO linked FROM public.transactions WHERE id = tx_b;
  IF linked <> tx_c THEN
    RAISE EXCEPTION 'FAIL: migrate_transfer_link: tx_b.transfer_linked_id expected %, got %', tx_c, linked;
  END IF;

  SELECT transfer_linked_id INTO linked FROM public.transactions WHERE id = tx_c;
  IF linked <> tx_b THEN
    RAISE EXCEPTION 'FAIL: migrate_transfer_link: tx_c.transfer_linked_id expected %, got %', tx_b, linked;
  END IF;

  -- Cleanup
  DELETE FROM public.transactions WHERE account_id IN (acct_a, acct_b);
  DELETE FROM public.categories WHERE id = cat_id;
  DELETE FROM public.accounts WHERE id IN (acct_a, acct_b);
  DELETE FROM public.families WHERE id = fam_id;

  RAISE NOTICE 'All transfer_link tests passed';
END;
$$;

RESET session_replication_role;
