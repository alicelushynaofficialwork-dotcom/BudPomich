begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles is required before aligning master and portfolio schemas';
  end if;
end
$$;

alter table public.profiles
  add column if not exists master_slug text;

-- Re-apply the known production account link only when the profile is still
-- unlinked. Never replace an existing explicit link.
update public.profiles as profile
set
  master_slug = 'andrey-ponomarenko',
  updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('koronad99779977@gmail.com')
  and profile.role = 'master'
  and profile.master_slug is null;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where master_slug is not null
      and (
        role <> 'master'
        or master_slug <> lower(master_slug)
        or master_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      )
  ) then
    raise exception
      'profiles.master_slug contains an invalid link; fix role/slug values before applying this migration';
  end if;

  if exists (
    select 1
    from public.profiles
    where master_slug is not null
    group by master_slug
    having count(*) > 1
  ) then
    raise exception
      'profiles.master_slug contains duplicates; resolve them before applying this migration';
  end if;
end
$$;

create unique index if not exists profiles_master_slug_unique
  on public.profiles(master_slug)
  where master_slug is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_master_slug_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_master_slug_format_check
      check (
        master_slug is null
        or master_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_master_slug_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_master_slug_role_check
      check (master_slug is null or role = 'master');
  end if;
end
$$;

comment on column public.profiles.master_slug is
  'Canonical public master identifier. It must be unique, URL-safe, and set only for master profiles.';

create or replace function public.protect_profile_master_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.master_slug is distinct from old.master_slug
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'profile master_slug can only be changed by a trusted administrative workflow'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_master_slug on public.profiles;
create trigger profiles_protect_master_slug
before update of master_slug on public.profiles
for each row
execute function public.protect_profile_master_slug();

revoke update (master_slug) on public.profiles from authenticated;

create table if not exists public.master_profile_edits (
  master_id text primary key,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  profession text not null,
  city text not null,
  district text,
  description text not null default '',
  full_description text not null default '',
  avatar_url text,
  cover_image_url text,
  avatar_zoom numeric not null default 1,
  avatar_position_x numeric not null default 50,
  avatar_position_y numeric not null default 35,
  cover_zoom numeric not null default 1,
  cover_position_x numeric not null default 50,
  cover_position_y numeric not null default 50,
  price_from numeric(12, 2) not null default 0,
  experience text not null default '',
  services jsonb not null default '[]'::jsonb,
  contacts jsonb not null default '[]'::jsonb,
  is_profile_active boolean not null default true,
  accepts_budpomich_requests boolean not null default true,
  verification jsonb not null default '{}'::jsonb,
  work_conditions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.master_profile_edits
  add column if not exists owner_id uuid,
  add column if not exists name text,
  add column if not exists profession text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists description text,
  add column if not exists full_description text,
  add column if not exists avatar_url text,
  add column if not exists cover_image_url text,
  add column if not exists avatar_zoom numeric default 1,
  add column if not exists avatar_position_x numeric default 50,
  add column if not exists avatar_position_y numeric default 35,
  add column if not exists cover_zoom numeric default 1,
  add column if not exists cover_position_x numeric default 50,
  add column if not exists cover_position_y numeric default 50,
  add column if not exists price_from numeric(12, 2) default 0,
  add column if not exists experience text,
  add column if not exists services jsonb default '[]'::jsonb,
  add column if not exists contacts jsonb default '[]'::jsonb,
  add column if not exists is_profile_active boolean default true,
  add column if not exists accepts_budpomich_requests boolean default true,
  add column if not exists verification jsonb default '{}'::jsonb,
  add column if not exists work_conditions jsonb default '[]'::jsonb,
  add column if not exists updated_at timestamptz default now();

update public.master_profile_edits as edit
set owner_id = profile.id
from public.profiles as profile
where profile.role = 'master'
  and profile.master_slug = edit.master_id
  and edit.owner_id is null;

update public.master_profile_edits as edit
set
  name = coalesce(nullif(edit.name, ''), nullif(profile.full_name, ''), edit.master_id),
  profession = coalesce(nullif(edit.profession, ''), 'Майстер'),
  city = coalesce(nullif(edit.city, ''), nullif(profile.city, ''), 'Не вказано'),
  description = coalesce(edit.description, ''),
  full_description = coalesce(edit.full_description, ''),
  avatar_zoom = coalesce(edit.avatar_zoom, 1),
  avatar_position_x = coalesce(edit.avatar_position_x, 50),
  avatar_position_y = coalesce(edit.avatar_position_y, 35),
  cover_zoom = coalesce(edit.cover_zoom, 1),
  cover_position_x = coalesce(edit.cover_position_x, 50),
  cover_position_y = coalesce(edit.cover_position_y, 50),
  price_from = coalesce(edit.price_from, 0),
  experience = coalesce(edit.experience, ''),
  services = coalesce(edit.services, '[]'::jsonb),
  contacts = coalesce(edit.contacts, '[]'::jsonb),
  is_profile_active = coalesce(edit.is_profile_active, true),
  accepts_budpomich_requests = coalesce(edit.accepts_budpomich_requests, true),
  verification = coalesce(edit.verification, '{}'::jsonb),
  work_conditions = coalesce(edit.work_conditions, '[]'::jsonb),
  updated_at = coalesce(edit.updated_at, now())
from public.profiles as profile
where profile.master_slug = edit.master_id;

update public.master_profile_edits
set
  name = coalesce(nullif(name, ''), master_id),
  profession = coalesce(nullif(profession, ''), 'Майстер'),
  city = coalesce(nullif(city, ''), 'Не вказано'),
  description = coalesce(description, ''),
  full_description = coalesce(full_description, ''),
  avatar_zoom = coalesce(avatar_zoom, 1),
  avatar_position_x = coalesce(avatar_position_x, 50),
  avatar_position_y = coalesce(avatar_position_y, 35),
  cover_zoom = coalesce(cover_zoom, 1),
  cover_position_x = coalesce(cover_position_x, 50),
  cover_position_y = coalesce(cover_position_y, 50),
  price_from = coalesce(price_from, 0),
  experience = coalesce(experience, ''),
  services = coalesce(services, '[]'::jsonb),
  contacts = coalesce(contacts, '[]'::jsonb),
  is_profile_active = coalesce(is_profile_active, true),
  accepts_budpomich_requests = coalesce(accepts_budpomich_requests, true),
  verification = coalesce(verification, '{}'::jsonb),
  work_conditions = coalesce(work_conditions, '[]'::jsonb),
  updated_at = coalesce(updated_at, now());

alter table public.master_profile_edits
  alter column description set default '',
  alter column full_description set default '',
  alter column avatar_zoom set default 1,
  alter column avatar_position_x set default 50,
  alter column avatar_position_y set default 35,
  alter column cover_zoom set default 1,
  alter column cover_position_x set default 50,
  alter column cover_position_y set default 50,
  alter column price_from set default 0,
  alter column experience set default '',
  alter column services set default '[]'::jsonb,
  alter column contacts set default '[]'::jsonb,
  alter column is_profile_active set default true,
  alter column accepts_budpomich_requests set default true,
  alter column verification set default '{}'::jsonb,
  alter column work_conditions set default '[]'::jsonb,
  alter column updated_at set default now();

alter table public.master_profile_edits
  alter column name set not null,
  alter column profession set not null,
  alter column city set not null,
  alter column description set not null,
  alter column full_description set not null,
  alter column avatar_zoom set not null,
  alter column avatar_position_x set not null,
  alter column avatar_position_y set not null,
  alter column cover_zoom set not null,
  alter column cover_position_x set not null,
  alter column cover_position_y set not null,
  alter column price_from set not null,
  alter column experience set not null,
  alter column services set not null,
  alter column contacts set not null,
  alter column is_profile_active set not null,
  alter column accepts_budpomich_requests set not null,
  alter column verification set not null,
  alter column work_conditions set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.master_profile_edits'::regclass
      and conname = 'master_profile_edits_owner_id_fkey'
  ) then
    alter table public.master_profile_edits
      add constraint master_profile_edits_owner_id_fkey
      foreign key (owner_id) references auth.users(id) on delete set null
      not valid;
  end if;
end
$$;

create unique index if not exists master_profile_edits_master_id_unique
  on public.master_profile_edits(master_id);
create index if not exists master_profile_edits_owner_id_idx
  on public.master_profile_edits(owner_id);

insert into public.master_profile_edits (
  master_id,
  owner_id,
  name,
  profession,
  city,
  description,
  full_description,
  price_from,
  experience,
  services,
  contacts,
  is_profile_active,
  accepts_budpomich_requests,
  verification,
  work_conditions
)
select
  profile.master_slug,
  profile.id,
  coalesce(nullif(profile.full_name, ''), profile.master_slug),
  'Майстер',
  coalesce(nullif(profile.city, ''), 'Не вказано'),
  '',
  '',
  0,
  '',
  '[]'::jsonb,
  '[]'::jsonb,
  true,
  true,
  '{}'::jsonb,
  '[]'::jsonb
from public.profiles as profile
where profile.role = 'master'
  and profile.master_slug is not null
on conflict (master_id) do update
set owner_id = coalesce(public.master_profile_edits.owner_id, excluded.owner_id);

alter table public.master_profile_edits enable row level security;

drop policy if exists "Public profiles are readable" on public.master_profile_edits;
create policy "Public profiles are readable"
  on public.master_profile_edits
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated masters can create their profile edits" on public.master_profile_edits;
drop policy if exists "Linked masters can create their profile edits" on public.master_profile_edits;
create policy "Linked masters can create their profile edits"
  on public.master_profile_edits
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'master'
        and profile.master_slug = master_profile_edits.master_id
    )
  );

drop policy if exists "Profile owners can update their profile edits" on public.master_profile_edits;
drop policy if exists "Linked masters can update their profile edits" on public.master_profile_edits;
create policy "Linked masters can update their profile edits"
  on public.master_profile_edits
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'master'
        and profile.master_slug = master_profile_edits.master_id
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'master'
        and profile.master_slug = master_profile_edits.master_id
    )
  );

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  master_id text not null,
  owner_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  city text not null default '',
  object_type text not null default '',
  photo_url text not null default '',
  total_amount numeric(12, 2) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.portfolio_items
  add column if not exists master_id text,
  add column if not exists owner_id uuid,
  add column if not exists title text,
  add column if not exists description text default '',
  add column if not exists city text default '',
  add column if not exists object_type text default '',
  add column if not exists photo_url text default '',
  add column if not exists total_amount numeric(12, 2) default 0,
  add column if not exists meta jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

update public.portfolio_items as item
set
  master_id = coalesce(item.master_id, profile.master_slug),
  owner_id = coalesce(item.owner_id, profile.id)
from public.profiles as profile
where profile.role = 'master'
  and profile.master_slug is not null
  and (
    item.owner_id = profile.id
    or (item.owner_id is null and item.master_id = profile.master_slug)
  );

update public.portfolio_items
set
  title = coalesce(nullif(title, ''), 'Робота без назви'),
  description = coalesce(description, ''),
  city = coalesce(city, ''),
  object_type = coalesce(object_type, ''),
  photo_url = coalesce(photo_url, ''),
  total_amount = coalesce(total_amount, 0),
  meta = coalesce(meta, '{}'::jsonb),
  created_at = coalesce(created_at, now());

alter table public.portfolio_items
  alter column description set default '',
  alter column city set default '',
  alter column object_type set default '',
  alter column photo_url set default '',
  alter column total_amount set default 0,
  alter column meta set default '{}'::jsonb,
  alter column created_at set default now();

alter table public.portfolio_items
  alter column title set not null,
  alter column description set not null,
  alter column city set not null,
  alter column object_type set not null,
  alter column photo_url set not null,
  alter column total_amount set not null,
  alter column meta set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.portfolio_items'::regclass
      and conname = 'portfolio_items_owner_id_fkey'
  ) then
    alter table public.portfolio_items
      add constraint portfolio_items_owner_id_fkey
      foreign key (owner_id) references auth.users(id) on delete set null
      not valid;
  end if;
end
$$;

create index if not exists portfolio_items_master_id_idx
  on public.portfolio_items(master_id, created_at desc);
create index if not exists portfolio_items_owner_id_idx
  on public.portfolio_items(owner_id, created_at desc);

create table if not exists public.portfolio_work_lines (
  id uuid primary key default gen_random_uuid(),
  portfolio_item_id uuid not null references public.portfolio_items(id) on delete cascade,
  work_type text not null,
  unit text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  volume numeric(12, 2) not null check (volume >= 0),
  total numeric(12, 2) generated always as (unit_price * volume) stored,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_work_lines
  add column if not exists portfolio_item_id uuid,
  add column if not exists work_type text,
  add column if not exists unit text,
  add column if not exists unit_price numeric(12, 2),
  add column if not exists volume numeric(12, 2),
  add column if not exists position integer default 0,
  add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portfolio_work_lines'
      and column_name = 'total'
  ) then
    alter table public.portfolio_work_lines
      add column total numeric(12, 2)
      generated always as (unit_price * volume) stored;
  end if;
end
$$;

update public.portfolio_work_lines
set
  work_type = coalesce(nullif(work_type, ''), 'Робота'),
  unit = coalesce(nullif(unit, ''), 'шт'),
  unit_price = coalesce(unit_price, 0),
  volume = coalesce(volume, 0),
  position = coalesce(position, 0),
  created_at = coalesce(created_at, now());

alter table public.portfolio_work_lines
  alter column work_type set not null,
  alter column unit set not null,
  alter column unit_price set not null,
  alter column volume set not null,
  alter column position set default 0,
  alter column position set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.portfolio_work_lines'::regclass
      and conname = 'portfolio_work_lines_portfolio_item_id_fkey'
  ) then
    alter table public.portfolio_work_lines
      add constraint portfolio_work_lines_portfolio_item_id_fkey
      foreign key (portfolio_item_id) references public.portfolio_items(id)
      on delete cascade
      not valid;
  end if;
end
$$;

create index if not exists portfolio_work_lines_item_id_idx
  on public.portfolio_work_lines(portfolio_item_id, position);

alter table public.portfolio_items enable row level security;
alter table public.portfolio_work_lines enable row level security;

drop policy if exists "Portfolio items are publicly readable" on public.portfolio_items;
create policy "Portfolio items are publicly readable"
  on public.portfolio_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated masters can create portfolio items" on public.portfolio_items;
drop policy if exists "Linked masters can create portfolio items" on public.portfolio_items;
create policy "Linked masters can create portfolio items"
  on public.portfolio_items
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'master'
        and profile.master_slug = portfolio_items.master_id
    )
  );

drop policy if exists "Portfolio owners can update portfolio items" on public.portfolio_items;
drop policy if exists "Linked masters can update portfolio items" on public.portfolio_items;
create policy "Linked masters can update portfolio items"
  on public.portfolio_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'master'
        and profile.master_slug = portfolio_items.master_id
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'master'
        and profile.master_slug = portfolio_items.master_id
    )
  );

drop policy if exists "Portfolio owners can delete portfolio items" on public.portfolio_items;
drop policy if exists "Linked masters can delete portfolio items" on public.portfolio_items;
create policy "Linked masters can delete portfolio items"
  on public.portfolio_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'master'
        and profile.master_slug = portfolio_items.master_id
    )
  );

drop policy if exists "Portfolio work lines are publicly readable" on public.portfolio_work_lines;
create policy "Portfolio work lines are publicly readable"
  on public.portfolio_work_lines
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Portfolio owners can create work lines" on public.portfolio_work_lines;
drop policy if exists "Linked masters can create work lines" on public.portfolio_work_lines;
create policy "Linked masters can create work lines"
  on public.portfolio_work_lines
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.portfolio_items as item
      join public.profiles as profile
        on profile.id = auth.uid()
       and profile.role = 'master'
       and profile.master_slug = item.master_id
      where item.id = portfolio_work_lines.portfolio_item_id
        and item.owner_id = auth.uid()
    )
  );

drop policy if exists "Portfolio owners can update work lines" on public.portfolio_work_lines;
drop policy if exists "Linked masters can update work lines" on public.portfolio_work_lines;
create policy "Linked masters can update work lines"
  on public.portfolio_work_lines
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.portfolio_items as item
      join public.profiles as profile
        on profile.id = auth.uid()
       and profile.role = 'master'
       and profile.master_slug = item.master_id
      where item.id = portfolio_work_lines.portfolio_item_id
    )
  )
  with check (
    exists (
      select 1
      from public.portfolio_items as item
      join public.profiles as profile
        on profile.id = auth.uid()
       and profile.role = 'master'
       and profile.master_slug = item.master_id
      where item.id = portfolio_work_lines.portfolio_item_id
        and item.owner_id = auth.uid()
    )
  );

drop policy if exists "Portfolio owners can delete work lines" on public.portfolio_work_lines;
drop policy if exists "Linked masters can delete work lines" on public.portfolio_work_lines;
create policy "Linked masters can delete work lines"
  on public.portfolio_work_lines
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.portfolio_items as item
      join public.profiles as profile
        on profile.id = auth.uid()
       and profile.role = 'master'
       and profile.master_slug = item.master_id
      where item.id = portfolio_work_lines.portfolio_item_id
    )
  );

do $$
begin
  if to_regclass('public.requests') is not null then
    execute 'drop policy if exists "Masters can read profile requests" on public.requests';
    execute $policy$
      create policy "Masters can read profile requests"
      on public.requests for select to authenticated
      using (
        exists (
          select 1
          from public.profiles as profile
          where profile.id = auth.uid()
            and profile.role = 'master'
            and profile.master_slug = requests.master_id
        )
      )
    $policy$;

    execute 'drop policy if exists "Masters can update profile requests" on public.requests';
    execute $policy$
      create policy "Masters can update profile requests"
      on public.requests for update to authenticated
      using (
        exists (
          select 1
          from public.profiles as profile
          where profile.id = auth.uid()
            and profile.role = 'master'
            and profile.master_slug = requests.master_id
        )
      )
      with check (
        exists (
          select 1
          from public.profiles as profile
          where profile.id = auth.uid()
            and profile.role = 'master'
            and profile.master_slug = requests.master_id
        )
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.request_messages') is not null
     and to_regclass('public.requests') is not null then
    execute 'drop policy if exists "Linked masters read request messages" on public.request_messages';
    execute $policy$
      create policy "Linked masters read request messages"
      on public.request_messages for select to authenticated
      using (
        exists (
          select 1
          from public.requests as request
          join public.profiles as profile on profile.id = auth.uid()
          where request.id = request_messages.request_id
            and profile.role = 'master'
            and profile.master_slug = request.master_id
        )
      )
    $policy$;

    execute 'drop policy if exists "Linked masters insert request messages" on public.request_messages';
    execute $policy$
      create policy "Linked masters insert request messages"
      on public.request_messages for insert to authenticated
      with check (
        sender_id = auth.uid()
        and sender_role = 'master'
        and exists (
          select 1
          from public.requests as request
          join public.profiles as profile on profile.id = auth.uid()
          where request.id = request_messages.request_id
            and request.client_id = request_messages.client_id
            and request.master_id = request_messages.master_id
            and profile.role = 'master'
            and profile.master_slug = request.master_id
        )
      )
    $policy$;
  end if;
end
$$;

commit;
