-- 015: Transfer constraint trigger (deferrable) + atomic RPCs for link/unlink/migrate
-- Also updates unreconciled_manual_transactions to include transfer_linked_id

-- 1. Deferrable constraint trigger: validates transfer_linked_id bidireccionality
create or replace function public.validate_transfer_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  partner_linked_id uuid;
  partner_account_id uuid;
  partner_amount numeric;
begin
  -- Only validate when transfer_linked_id is set
  if new.transfer_linked_id is null then
    return new;
  end if;

  -- Partner must exist and point back
  select t.transfer_linked_id, t.account_id, t.amount
    into partner_linked_id, partner_account_id, partner_amount
    from public.transactions t
    where t.id = new.transfer_linked_id;

  if not found then
    raise exception 'transfer_linked_id aponta para transacao inexistente.';
  end if;

  if partner_linked_id is distinct from new.id then
    raise exception 'transfer_linked_id nao e bidirecional: parceiro nao aponta de volta.';
  end if;

  -- Must be in different accounts
  if partner_account_id = new.account_id then
    raise exception 'Transferencia deve ser entre contas diferentes.';
  end if;

  -- Signs must be opposite
  if sign(new.amount) = sign(partner_amount) then
    raise exception 'Transferencia exige sinais opostos nos amounts.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_transfer_link on public.transactions;
create constraint trigger trg_validate_transfer_link
  after insert or update of transfer_linked_id on public.transactions
  deferrable initially deferred
  for each row
  execute function public.validate_transfer_link();

-- 2. RPC: link_transfer — atomically link two transactions as transfer
create or replace function public.link_transfer(
  tx_a uuid,
  tx_b uuid,
  transfer_category uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.transactions
    set transfer_linked_id = tx_b,
        category_id = transfer_category,
        auto_categorized = false
    where id = tx_a;

  update public.transactions
    set transfer_linked_id = tx_a,
        category_id = transfer_category,
        auto_categorized = false
    where id = tx_b;
end;
$$;

grant execute on function public.link_transfer(uuid, uuid, uuid) to authenticated, service_role;

-- 3. RPC: unlink_transfer — atomically unlink a transfer pair
create or replace function public.unlink_transfer(tx_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  partner_id uuid;
begin
  select transfer_linked_id into partner_id
    from public.transactions
    where id = tx_id;

  if partner_id is null then
    return;
  end if;

  update public.transactions
    set transfer_linked_id = null,
        category_id = null
    where id = tx_id;

  update public.transactions
    set transfer_linked_id = null,
        category_id = null
    where id = partner_id;
end;
$$;

grant execute on function public.unlink_transfer(uuid) to authenticated, service_role;

-- 4. RPC: migrate_transfer_link — after deleting a manual that was linked,
--    re-link its old partner to a new OFX transaction
create or replace function public.migrate_transfer_link(
  old_partner_id uuid,
  new_ofx_id uuid,
  transfer_category uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The old partner's transfer_linked_id was SET NULL by ON DELETE SET NULL.
  -- Now link old_partner <-> new_ofx
  update public.transactions
    set transfer_linked_id = new_ofx_id,
        category_id = transfer_category,
        auto_categorized = false
    where id = old_partner_id;

  update public.transactions
    set transfer_linked_id = old_partner_id,
        category_id = transfer_category,
        auto_categorized = false
    where id = new_ofx_id;
end;
$$;

grant execute on function public.migrate_transfer_link(uuid, uuid, uuid) to authenticated, service_role;

-- 5. Update unreconciled_manual_transactions to include transfer_linked_id
-- Must drop first because return type changed (added transfer_linked_id column)
drop function if exists public.unreconciled_manual_transactions(uuid);
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
  reconciliation_hint jsonb,
  transfer_linked_id uuid
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
    t.reconciliation_hint,
    t.transfer_linked_id
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  left join public.categories c on c.id = t.category_id
  where a.family_id = family_uuid
    and a.is_reconcilable = true
    and a.reconciled_until is not null
    and t.posted_at <= a.reconciled_until
    and t.posted_at >= coalesce((
      select min(ox.posted_at)
      from public.transactions ox
      where ox.account_id = a.id and ox.source = 'ofx'
    ), a.reconciled_until)
    and (t.source is null or t.source in ('manual', 'transfer'))
    and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()))
  order by t.posted_at asc, t.created_at asc;
$$;

grant execute on function public.unreconciled_manual_transactions(uuid) to anon, authenticated, service_role;
