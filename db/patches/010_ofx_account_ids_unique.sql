CREATE UNIQUE INDEX IF NOT EXISTS accounts_ofx_ids_unique
  ON accounts (family_id, ofx_bank_id, ofx_account_id)
  WHERE ofx_bank_id IS NOT NULL AND ofx_account_id IS NOT NULL;
