create extension if not exists "pgcrypto";

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  master_id text not null,
  title text not null,
  description text not null default '',
  city text not null,
  object_type text not null,
  photo_url text not null default '',
  total_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

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

create index if not exists portfolio_items_master_id_idx
  on public.portfolio_items(master_id, created_at desc);

create index if not exists portfolio_work_lines_item_id_idx
  on public.portfolio_work_lines(portfolio_item_id, position);

alter table public.portfolio_items enable row level security;
alter table public.portfolio_work_lines enable row level security;

create policy "Portfolio items are publicly readable"
  on public.portfolio_items for select
  using (true);

create policy "Portfolio work lines are publicly readable"
  on public.portfolio_work_lines for select
  using (true);

-- Writes should be performed by the authenticated server route with
-- SUPABASE_SERVICE_ROLE_KEY. Add owner-scoped policies when auth is connected.
