alter table public.master_profile_edits
  add column if not exists verification jsonb not null default '{}'::jsonb,
  add column if not exists work_conditions jsonb not null default '[]'::jsonb;

create or replace function public.protect_master_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) = false then
    if tg_op = 'INSERT' then
      new.verification := '{}'::jsonb;
    else
      new.verification := old.verification;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_master_verification on public.master_profile_edits;
create trigger protect_master_verification
before insert or update of verification on public.master_profile_edits
for each row execute function public.protect_master_verification();

comment on column public.master_profile_edits.verification is
  'Read-only for profile owners. Verification statuses are set only by trusted administrative processes.';
