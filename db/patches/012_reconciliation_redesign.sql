-- 012_reconciliation_redesign.sql
-- Novas colunas e funções RPC para reconciliação redesenhada

-- 1. Nova coluna em families: configurações de reconciliação
alter table public.families
  add column if not exists reconciliation_settings jsonb;

-- 2. Nova coluna em transactions: dica de reconciliação
alter table public.transactions
  add column if not exists reconciliation_hint jsonb;

-- 3. RPC: transações manuais não reconciliadas em contas reconciliáveis
create or replace function public.unreconciled_manual_transactions(family_uuid uuid)
returns table (
  id uuid,
  account_id uuid,
  account_name text,
  amount numeric,
  description text,
  original_description text,
  posted_at date,
  source text,
  external_id text,
  category_id uuid,
  category_name text,
  category_type text,
  reconciliation_hint jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.account_id,
    a.name as account_name,
    t.amount,
    t.description,
    t.original_description,
    t.posted_at,
    t.source,
    t.external_id,
    t.category_id,
    c.name as category_name,
    c.category_type::text as category_type,
    t.reconciliation_hint
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  left join public.categories c on c.id = t.category_id
  where a.family_id = family_uuid
    and a.is_reconcilable = true
    and a.reconciled_until is not null
    and t.posted_at <= a.reconciled_until
    and (t.source is null or t.source = 'manual')
    and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()))
  order by t.posted_at asc, t.created_at asc;
$$;

grant execute on function public.unreconciled_manual_transactions(uuid) to anon, authenticated, service_role;

-- 4. RPC: count de OFX sem categoria
create or replace function public.uncategorized_ofx_count(family_uuid uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where a.family_id = family_uuid
    and t.source = 'ofx'
    and t.category_id is null
    and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()));
$$;

grant execute on function public.uncategorized_ofx_count(uuid) to anon, authenticated, service_role;

-- 5. RPC: count de manuais não reconciliadas
create or replace function public.unreconciled_manual_count(family_uuid uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where a.family_id = family_uuid
    and a.is_reconcilable = true
    and a.reconciled_until is not null
    and t.posted_at <= a.reconciled_until
    and (t.source is null or t.source = 'manual')
    and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()));
$$;

grant execute on function public.unreconciled_manual_count(uuid) to anon, authenticated, service_role;
