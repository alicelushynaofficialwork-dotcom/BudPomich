create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  master_id text not null,
  master_name text not null,
  selected_service_id text not null,
  selected_service_title text not null,
  selected_service_type text not null,
  is_turnkey boolean not null default false,
  client_name text not null,
  client_phone text not null,
  work_type text not null,
  work_subtype text,
  description text not null,
  desired_date text,
  city_area text,
  budget text,
  main_volume text,
  additional_info text,
  message text,
  periods jsonb not null default '[]'::jsonb,
  service_details jsonb not null default '{}'::jsonb,
  additional_works jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  has_height_work text,
  height_value text,
  height_unit text,
  height_work_volume text,
  height_work_volume_unit text,
  height_access_type text,
  height_work_location text,
  height_coefficient text,
  height_coefficient_type text,
  height_norm_reference text,
  height_comment text,
  status text not null default 'new' check (status in ('new', 'accepted', 'in_progress', 'completed', 'declined')),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_client_id_idx on public.requests(client_id);
create index if not exists requests_master_id_idx on public.requests(master_id);
create index if not exists requests_status_idx on public.requests(status);
create index if not exists requests_created_at_idx on public.requests(created_at);

alter table public.requests enable row level security;

-- Only authenticated clients may insert and own requests
drop policy if exists "Clients can insert own requests" on public.requests;
create policy "Clients can insert own requests"
  on public.requests
  for insert
  to authenticated
  with check (
    auth.uid() = client_id
    and (select role from public.profiles where id = auth.uid()) = 'client'
  );

-- Clients may read only their own requests
drop policy if exists "Clients can read own requests" on public.requests;
create policy "Clients can read own requests"
  on public.requests
  for select
  to authenticated
  using (
    auth.uid() = client_id
  );

-- Clients may update only their own requests
drop policy if exists "Clients can update own requests" on public.requests;
create policy "Clients can update own requests"
  on public.requests
  for update
  to authenticated
  using (
    auth.uid() = client_id
  )
  with check (
    auth.uid() = client_id
  );
