create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.requests(id) on delete restrict,
  master_id text not null,
  client_id uuid not null references public.profiles(id) on delete restrict,
  client_public_name text not null,
  service_title text,
  project_id uuid references public.portfolio_items(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  quality_rating smallint check (quality_rating between 1 and 5),
  deadlines_rating smallint check (deadlines_rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  estimate_rating smallint check (estimate_rating between 1 and 5),
  cleanliness_rating smallint check (cleanliness_rating between 1 and 5),
  text text not null check (char_length(trim(text)) between 20 and 4000),
  image_urls text[] not null default '{}',
  status text not null default 'published' check (status in ('published', 'pending', 'hidden')),
  master_reply text check (master_reply is null or char_length(trim(master_reply)) between 2 and 2000),
  master_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists reviews_master_published_idx on public.reviews(master_id, created_at desc) where status = 'published';
create index if not exists reviews_client_idx on public.reviews(client_id, created_at desc);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "Published reviews are public" on public.reviews;
create policy "Published reviews are public" on public.reviews for select to anon, authenticated using (status = 'published');

drop policy if exists "Clients can read own reviews" on public.reviews;
create policy "Clients can read own reviews" on public.reviews for select to authenticated using (client_id = auth.uid());

drop policy if exists "Clients review own completed bookings" on public.reviews;
create policy "Clients review own completed bookings" on public.reviews for insert to authenticated with check (
  client_id = auth.uid()
  and status in ('published', 'pending')
  and master_reply is null
  and master_replied_at is null
  and exists (
    select 1 from public.requests request
    where request.id = booking_id
      and request.client_id = auth.uid()
      and request.master_id = master_id
      and request.status = 'completed'
  )
  and (project_id is null or exists (
    select 1 from public.portfolio_items project
    where project.id = project_id and project.master_id = master_id
  ))
);

revoke update, delete on public.reviews from anon, authenticated;

create or replace function public.reply_to_review(review_id uuid, reply_text text)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare target public.reviews;
begin
  if char_length(trim(reply_text)) not between 2 and 2000 then
    raise exception 'Некоректна довжина відповіді';
  end if;
  select * into target from public.reviews where id = review_id;
  if target.id is null then raise exception 'Відгук не знайдено'; end if;
  if target.master_reply is not null then raise exception 'Відповідь уже додано'; end if;
  if not exists (
    select 1 from public.master_profile_edits profile
    where profile.master_id = target.master_id and profile.owner_id = auth.uid()
  ) then raise exception 'Недостатньо прав'; end if;
  update public.reviews set master_reply = trim(reply_text), master_replied_at = now(), updated_at = now()
  where id = review_id returning * into target;
  return target;
end;
$$;

revoke all on function public.reply_to_review(uuid, text) from public;
grant execute on function public.reply_to_review(uuid, text) to authenticated;
