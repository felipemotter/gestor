create or replace function public.enforce_category_max_depth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'category parent_id cannot reference itself' using errcode = 'check_violation';
  end if;

  select parent_id
    into parent_parent_id
    from public.categories
    where id = new.parent_id;

  if parent_parent_id is not null then
    raise exception 'subcategoria nao pode ter subcategoria' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.categories where parent_id = new.id) then
    raise exception 'categoria com subcategorias nao pode virar subcategoria' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_categories_max_depth on public.categories;

create trigger trg_categories_max_depth
before insert or update of parent_id on public.categories
for each row
execute function public.enforce_category_max_depth();

