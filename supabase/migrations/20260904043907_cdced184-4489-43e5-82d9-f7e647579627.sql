-- Prevent riders from self-approving: only admins may change is_approved / vetted fields
create or replace function public.riders_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.is_approved is distinct from old.is_approved then
    raise exception 'Only admins can change rider approval status';
  end if;
  return new;
end;
$$;

drop trigger if exists riders_guard_update on public.riders;
create trigger riders_guard_update
before update on public.riders
for each row execute function public.riders_guard_update();