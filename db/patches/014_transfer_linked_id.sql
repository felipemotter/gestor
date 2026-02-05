-- Add transfer_linked_id to transactions for OFX transfer pairing
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_linked_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_transfer_linked_id_idx
  ON public.transactions (transfer_linked_id)
  WHERE transfer_linked_id IS NOT NULL;
