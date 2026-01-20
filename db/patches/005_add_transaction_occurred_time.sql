-- Adds optional user-entered time for statement ordering and display.

alter table public.transactions
  add column if not exists occurred_time time;

create index if not exists transactions_account_posted_time_idx
  on public.transactions (account_id, posted_at, occurred_time, created_at);

create or replace function public.account_balance_at(account_uuid uuid, at_date date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(a.opening_balance, 0) +
    coalesce((
      select sum(
        case
          when t.source = 'transfer' then t.amount
          when t.source = 'adjustment' then t.amount
          when c.category_type = 'income' then t.amount
          when c.category_type = 'expense' then -t.amount
          else 0
        end
      )
      from public.transactions t
      left join public.categories c on c.id = t.category_id
      where t.account_id = a.id
        and t.posted_at <= at_date
    ), 0)
  from public.accounts a
  where a.id = account_uuid;
$$;

-- Allow PostgREST RPC for signed-in users (and service role).
grant execute on function public.account_balance_at(uuid, date) to anon, authenticated, service_role;

-- Refresh PostgREST schema cache (optional but helpful after migrations).
select pg_notify('pgrst', 'reload schema');
