-- Add priority column to rules table for ordering rule evaluation
ALTER TABLE public.rules ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS rules_family_priority_idx
  ON public.rules (family_id, priority ASC, created_at ASC);
