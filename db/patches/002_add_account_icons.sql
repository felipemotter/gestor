alter table public.accounts
  add column if not exists icon_key text,
  add column if not exists icon_bg text,
  add column if not exists icon_color text;
