create table if not exists public.master_profile_edits (
  master_id text primary key,
  name text not null,
  profession text not null,
  city text not null,
  description text not null,
  full_description text not null,
  price_from numeric(12, 2) not null check (price_from >= 0),
  experience text not null,
  services jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.master_profile_edits enable row level security;

create policy "Public profiles are readable"
  on public.master_profile_edits
  for select
  using (true);
