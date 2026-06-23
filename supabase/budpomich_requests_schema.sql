create table if not exists public.master_services (
  id uuid primary key default gen_random_uuid(),
  master_id text not null,
  service_type text not null,
  service_title text not null,
  service_description text,
  is_turnkey boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
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
  status text not null default 'new' check (status in ('new', 'accepted', 'in_progress', 'completed', 'declined')),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_additional_works (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  title text not null,
  volume text,
  unit text,
  price_per_unit text,
  total_price text,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  file_url text,
  file_name text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  master_id text,
  sender_type text not null check (sender_type in ('client', 'master')),
  sender_name text,
  message_text text,
  body text,
  sender_role text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists requests_master_id_idx on public.requests(master_id);
create index if not exists requests_status_idx on public.requests(status);
create index if not exists messages_request_id_idx on public.messages(request_id);
