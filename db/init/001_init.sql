create extension if not exists "pgcrypto";

alter table auth.users
  alter column role set default 'authenticated';

update auth.users
  set role = 'authenticated'
  where role is null or role = '';

create or replace function auth.set_default_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is null or btrim(new.role) = '' then
    new.role := 'authenticated';
  end if;

  return new;
end;
$$;

drop trigger if exists set_default_role on auth.users;
create trigger set_default_role
  before insert or update on auth.users
  for each row execute function auth.set_default_role();

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'member_role' and n.nspname = 'public'
  ) then
    create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'account_visibility' and n.nspname = 'public'
  ) then
    create type public.account_visibility as enum ('shared', 'private');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'category_type' and n.nspname = 'public'
  ) then
    create type public.category_type as enum ('income', 'expense', 'transfer');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'import_status' and n.nspname = 'public'
  ) then
    create type public.import_status as enum ('pending', 'processed', 'failed');
  end if;
end $$;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create unique index if not exists memberships_user_id_key
  on public.memberships (user_id);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  account_type text not null default 'checking',
  currency text not null default 'BRL',
  visibility public.account_visibility not null default 'shared',
  owner_user_id uuid references auth.users(id),
  is_archived boolean not null default false,
  opening_balance numeric(14,2) not null default 0,
  icon_key text,
  icon_bg text,
  icon_color text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  category_type public.category_type not null default 'expense',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  source text not null,
  raw_hash text not null,
  status public.import_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists import_batches_unique_hash
  on public.import_batches (family_id, source, raw_hash);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id),
  amount numeric(14,2) not null,
  currency text not null default 'BRL',
  description text,
  posted_at date not null,
  notes text,
  source text,
  source_hash text,
  external_id text,
  import_batch_id uuid references public.import_batches(id),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists transactions_account_id_idx
  on public.transactions (account_id);

create index if not exists transactions_posted_at_idx
  on public.transactions (posted_at);

create index if not exists transactions_source_hash_idx
  on public.transactions (source_hash);

create or replace function public.enforce_balance_adjust_category_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  category_name text;
begin
  if new.category_id is null then
    return new;
  end if;

  select name into category_name from public.categories where id = new.category_id;
  if category_name is null then
    return new;
  end if;

  if lower(category_name) like lower('Ajuste de saldo%')
     and coalesce(new.source, '') <> 'adjustment' then
    raise exception 'Categoria Ajuste de saldo so pode ser usada em ajustes.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_adjust_category_guard on public.transactions;
create trigger trg_transactions_adjust_category_guard
before insert or update of category_id, source on public.transactions
for each row execute function public.enforce_balance_adjust_category_usage();

create or replace function public.account_balance(account_uuid uuid)
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
          when c.category_type = 'income' then t.amount
          when c.category_type = 'expense' then -t.amount
          else 0
        end
      )
      from public.transactions t
      left join public.categories c on c.id = t.category_id
      where t.account_id = a.id
    ), 0)
  from public.accounts a
  where a.id = account_uuid;
$$;

create or replace function public.enforce_account_archive_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric;
begin
  if new.is_archived is true and (old.is_archived is distinct from true) then
    select public.account_balance(new.id) into current_balance;
    if current_balance is null then
      raise exception 'Nao foi possivel calcular saldo da conta.';
    end if;
    if abs(current_balance) > 0.009 then
      raise exception 'Conta precisa estar zerada para arquivar.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_accounts_archive_balance on public.accounts;
create trigger trg_accounts_archive_balance
before update of is_archived on public.accounts
for each row execute function public.enforce_account_archive_balance();

create or replace function public.prevent_account_delete_with_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.transactions where account_id = old.id) then
    raise exception 'Conta possui lancamentos.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_accounts_prevent_delete on public.accounts;
create trigger trg_accounts_prevent_delete
before delete on public.accounts
for each row execute function public.prevent_account_delete_with_transactions();

create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  source text,
  transaction_id uuid references public.transactions(id) on delete set null,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  match jsonb not null default '{}'::jsonb,
  action jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_family_member(family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.memberships m
    where m.family_id = family
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_writer(family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.memberships m
    where m.family_id = family
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.is_family_admin(family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.memberships m
    where m.family_id = family
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.has_membership()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
  );
$$;

alter table public.families enable row level security;

create policy families_select on public.families
  for select
  using (
    public.is_family_member(id)
    or created_by = (select auth.uid())
  );

create policy families_insert on public.families
  for insert
  with check (
    (select auth.uid()) is not null
    and not (select public.has_membership())
  );

create policy families_update on public.families
  for update
  using (public.is_family_admin(id));

create policy families_delete on public.families
  for delete
  using (public.is_family_admin(id));

alter table public.memberships enable row level security;

create policy memberships_select on public.memberships
  for select
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.families f
      where f.id = family_id
        and f.created_by = (select auth.uid())
    )
  );

create policy memberships_insert on public.memberships
  for insert
  with check (
    exists (
      select 1
      from public.families f
      where f.id = family_id
        and f.created_by = (select auth.uid())
    )
  );

create policy memberships_update_admin on public.memberships
  for update
  using (
    exists (
      select 1
      from public.families f
      where f.id = family_id
        and f.created_by = (select auth.uid())
    )
  );

create policy memberships_delete_admin on public.memberships
  for delete
  using (
    exists (
      select 1
      from public.families f
      where f.id = family_id
        and f.created_by = (select auth.uid())
    )
  );

alter table public.accounts enable row level security;

create policy accounts_select on public.accounts
  for select
  using (
    public.is_family_member(family_id)
    and (visibility = 'shared' or owner_user_id = (select auth.uid()))
  );

create policy accounts_insert on public.accounts
  for insert
  with check (public.is_family_admin(family_id));

create policy accounts_update on public.accounts
  for update
  using (public.is_family_admin(family_id));

create policy accounts_delete on public.accounts
  for delete
  using (public.is_family_admin(family_id));

alter table public.categories enable row level security;

create policy categories_select on public.categories
  for select
  using (public.is_family_member(family_id));

create policy categories_insert on public.categories
  for insert
  with check (public.is_family_admin(family_id));

create policy categories_update on public.categories
  for update
  using (public.is_family_admin(family_id));

create policy categories_delete on public.categories
  for delete
  using (public.is_family_admin(family_id));

alter table public.tags enable row level security;

create policy tags_select on public.tags
  for select
  using (public.is_family_member(family_id));

create policy tags_insert on public.tags
  for insert
  with check (public.is_family_writer(family_id));

create policy tags_update on public.tags
  for update
  using (public.is_family_writer(family_id));

create policy tags_delete on public.tags
  for delete
  using (public.is_family_writer(family_id));

alter table public.import_batches enable row level security;

create policy import_batches_select on public.import_batches
  for select
  using (public.is_family_writer(family_id));

create policy import_batches_insert on public.import_batches
  for insert
  with check (public.is_family_writer(family_id));

create policy import_batches_update on public.import_batches
  for update
  using (public.is_family_admin(family_id));

create policy import_batches_delete on public.import_batches
  for delete
  using (public.is_family_admin(family_id));

alter table public.transactions enable row level security;

create policy transactions_select on public.transactions
  for select
  using (
    exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and public.is_family_member(a.family_id)
        and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()))
    )
  );

create policy transactions_insert on public.transactions
  for insert
  with check (
    exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and public.is_family_writer(a.family_id)
        and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()))
    )
  );

create policy transactions_update on public.transactions
  for update
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and public.is_family_admin(a.family_id)
    )
  );

create policy transactions_delete on public.transactions
  for delete
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and public.is_family_admin(a.family_id)
    )
  );

alter table public.transaction_tags enable row level security;

create policy transaction_tags_select on public.transaction_tags
  for select
  using (
    exists (
      select 1
      from public.transactions t
      join public.accounts a on a.id = t.account_id
      where t.id = transaction_id
        and public.is_family_member(a.family_id)
        and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()))
    )
  );

create policy transaction_tags_insert on public.transaction_tags
  for insert
  with check (
    exists (
      select 1
      from public.transactions t
      join public.accounts a on a.id = t.account_id
      where t.id = transaction_id
        and public.is_family_writer(a.family_id)
        and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()))
    )
  );

create policy transaction_tags_delete on public.transaction_tags
  for delete
  using (
    exists (
      select 1
      from public.transactions t
      join public.accounts a on a.id = t.account_id
      where t.id = transaction_id
        and public.is_family_writer(a.family_id)
        and (a.visibility = 'shared' or a.owner_user_id = (select auth.uid()))
    )
  );

alter table public.attachments enable row level security;

create policy attachments_select on public.attachments
  for select
  using (public.is_family_member(family_id));

create policy attachments_insert on public.attachments
  for insert
  with check (public.is_family_writer(family_id));

create policy attachments_update on public.attachments
  for update
  using (public.is_family_admin(family_id) or created_by = (select auth.uid()));

create policy attachments_delete on public.attachments
  for delete
  using (public.is_family_admin(family_id) or created_by = (select auth.uid()));

alter table public.rules enable row level security;

create policy rules_select on public.rules
  for select
  using (public.is_family_member(family_id));

create policy rules_insert on public.rules
  for insert
  with check (public.is_family_admin(family_id));

create policy rules_update on public.rules
  for update
  using (public.is_family_admin(family_id));

create policy rules_delete on public.rules
  for delete
  using (public.is_family_admin(family_id));

alter table public.audit_logs enable row level security;

create policy audit_logs_select on public.audit_logs
  for select
  using (public.is_family_admin(family_id));

create policy audit_logs_insert on public.audit_logs
  for insert
  with check (public.is_family_writer(family_id));

create policy audit_logs_delete on public.audit_logs
  for delete
  using (public.is_family_admin(family_id));

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
