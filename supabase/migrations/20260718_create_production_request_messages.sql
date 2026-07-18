create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  client_id uuid not null references public.profiles(id),
  master_id text not null,
  sender_id uuid not null references public.profiles(id),
  sender_role text not null check (sender_role in ('client', 'master')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists request_messages_request_id_idx on public.request_messages(request_id);
create index if not exists request_messages_client_id_idx on public.request_messages(client_id);
create index if not exists request_messages_master_id_idx on public.request_messages(master_id);
create index if not exists request_messages_sender_id_idx on public.request_messages(sender_id);
create index if not exists request_messages_created_at_idx on public.request_messages(created_at);

alter table public.request_messages enable row level security;

-- Only authenticated clients may insert messages for their own requests.
drop policy if exists "Clients can insert request messages" on public.request_messages;
create policy "Clients can insert request messages"
  on public.request_messages
  for insert
  to authenticated
  with check (
    auth.uid() = client_id
    and sender_id = auth.uid()
    and sender_role = 'client'
    and exists (
      select 1 from public.requests
      where id = request_id
        and client_id = auth.uid()
    )
  );

-- Clients may read messages only for their own requests.
drop policy if exists "Clients can read request messages" on public.request_messages;
create policy "Clients can read request messages"
  on public.request_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.requests
      where id = request_id
        and client_id = auth.uid()
    )
  );
