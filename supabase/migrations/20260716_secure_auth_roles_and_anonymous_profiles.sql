-- Stage 1: protect profile roles and keep anonymous Demo Auth users out of
-- the real user profile table. Existing profiles are intentionally preserved.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'client');

  insert into public.profiles (id, email, full_name, phone, city, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    case
      when requested_role in ('client', 'master', 'contractor') then requested_role::public.user_role
      else 'client'::public.user_role
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    city = coalesce(excluded.city, public.profiles.city),
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.prevent_untrusted_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'profile role can only be changed by a trusted administrative workflow'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_untrusted_role_change on public.profiles;
create trigger profiles_prevent_untrusted_role_change
before update of role on public.profiles
for each row
execute function public.prevent_untrusted_profile_role_change();

revoke update on table public.profiles from authenticated;
grant update (full_name, phone, city, avatar_url) on table public.profiles to authenticated;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Permanent users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
);
