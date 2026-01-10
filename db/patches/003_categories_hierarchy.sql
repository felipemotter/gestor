alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null,
  add column if not exists icon_key text,
  add column if not exists icon_bg text,
  add column if not exists icon_color text,
  add column if not exists is_archived boolean not null default false;

alter table public.categories
  drop constraint if exists categories_family_id_name_key;

create index if not exists categories_parent_id_idx
  on public.categories (parent_id);

create unique index if not exists categories_family_root_name_key
  on public.categories (family_id, name)
  where parent_id is null;

create unique index if not exists categories_family_parent_name_key
  on public.categories (family_id, parent_id, name)
  where parent_id is not null;
