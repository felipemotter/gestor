ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS original_description text;

-- Backfill: copiar description atual para original_description nos imports OFX existentes
UPDATE public.transactions
SET original_description = description
WHERE source = 'ofx' AND original_description IS NULL AND description IS NOT NULL;
