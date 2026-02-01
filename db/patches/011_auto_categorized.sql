ALTER TABLE transactions ADD COLUMN IF NOT EXISTS auto_categorized boolean NOT NULL DEFAULT false;
