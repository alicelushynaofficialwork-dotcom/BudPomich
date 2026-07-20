alter table public.requests
  add column if not exists source text not null default 'request_form',
  add column if not exists confirmed_period jsonb;

create index if not exists requests_client_created_idx on public.requests(client_id, created_at desc);
create index if not exists requests_master_created_idx on public.requests(master_id, created_at desc);

drop policy if exists "Clients can update own requests" on public.requests;

drop policy if exists "Masters can read profile requests" on public.requests;
create policy "Masters can read profile requests" on public.requests for select to authenticated using (
  exists (select 1 from public.master_profile_edits p where p.master_id = requests.master_id and p.owner_id = auth.uid())
);

drop policy if exists "Masters can update profile requests" on public.requests;
create policy "Masters can update profile requests" on public.requests for update to authenticated using (
  exists (select 1 from public.master_profile_edits p where p.master_id = requests.master_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.master_profile_edits p where p.master_id = requests.master_id and p.owner_id = auth.uid())
);

create table if not exists public.booking_attachments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.requests(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  kind text not null check (kind in ('image', 'document')),
  created_at timestamptz not null default now()
);

create index if not exists booking_attachments_booking_idx on public.booking_attachments(booking_id, created_at);
alter table public.booking_attachments enable row level security;

create or replace function public.can_access_booking(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.requests r
    where r.id = target_booking_id and (
      r.client_id = auth.uid() or exists (
        select 1 from public.master_profile_edits p where p.master_id = r.master_id and p.owner_id = auth.uid()
      )
    )
  );
$$;
revoke all on function public.can_access_booking(uuid) from public;
grant execute on function public.can_access_booking(uuid) to authenticated;

drop policy if exists "Booking participants read attachments" on public.booking_attachments;
create policy "Booking participants read attachments" on public.booking_attachments for select to authenticated
using (public.can_access_booking(booking_id));
drop policy if exists "Clients add own booking attachments" on public.booking_attachments;
create policy "Clients add own booking attachments" on public.booking_attachments for insert to authenticated
with check (uploaded_by = auth.uid() and exists (select 1 from public.requests r where r.id = booking_id and r.client_id = auth.uid()));
drop policy if exists "Uploaders delete own booking attachments" on public.booking_attachments;
create policy "Uploaders delete own booking attachments" on public.booking_attachments for delete to authenticated
using (uploaded_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-attachments', 'booking-attachments', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clients upload booking files" on storage.objects;
create policy "Clients upload booking files" on storage.objects for insert to authenticated with check (
  bucket_id = 'booking-attachments'
  and exists (select 1 from public.requests r where r.id::text = (storage.foldername(name))[1] and r.client_id = auth.uid())
);
drop policy if exists "Booking participants read files" on storage.objects;
create policy "Booking participants read files" on storage.objects for select to authenticated using (
  bucket_id = 'booking-attachments'
  and public.can_access_booking(((storage.foldername(name))[1])::uuid)
);
drop policy if exists "Clients delete own booking files" on storage.objects;
create policy "Clients delete own booking files" on storage.objects for delete to authenticated using (
  bucket_id = 'booking-attachments'
  and owner_id = auth.uid()::text
);
