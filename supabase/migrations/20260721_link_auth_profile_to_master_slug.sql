alter table public.profiles
  add column if not exists master_slug text;

create unique index if not exists profiles_master_slug_unique
  on public.profiles (master_slug)
  where master_slug is not null;

comment on column public.profiles.master_slug is
  'Links an authenticated profile UUID to the string identifier of its public master card.';

update public.profiles p
set
  master_slug = 'andrey-ponomarenko',
  updated_at = now()
from auth.users au
where p.id = au.id
  and lower(au.email) = lower('koronad99779977@gmail.com')
  and p.role = 'master'
  and p.master_slug is distinct from 'andrey-ponomarenko';

drop policy if exists "Masters can read profile requests" on public.requests;
create policy "Masters can read profile requests"
  on public.requests for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'master'
        and p.master_slug = requests.master_id
    )
  );

drop policy if exists "Masters can update profile requests" on public.requests;
create policy "Masters can update profile requests"
  on public.requests for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'master'
        and p.master_slug = requests.master_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'master'
        and p.master_slug = requests.master_id
    )
  );

drop policy if exists "Linked masters read request messages" on public.request_messages;
create policy "Linked masters read request messages"
  on public.request_messages for select to authenticated
  using (
    exists (
      select 1
      from public.requests r
      join public.profiles p on p.id = auth.uid()
      where r.id = request_messages.request_id
        and p.role = 'master'
        and p.master_slug = r.master_id
    )
  );

drop policy if exists "Linked masters insert request messages" on public.request_messages;
create policy "Linked masters insert request messages"
  on public.request_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = 'master'
    and exists (
      select 1
      from public.requests r
      join public.profiles p on p.id = auth.uid()
      where r.id = request_messages.request_id
        and r.client_id = request_messages.client_id
        and r.master_id = request_messages.master_id
        and p.role = 'master'
        and p.master_slug = r.master_id
    )
  );

drop policy if exists "Booking participants update message read status" on public.request_messages;
create policy "Booking participants update message read status"
  on public.request_messages for update to authenticated
  using (public.can_access_booking(request_id))
  with check (public.can_access_booking(request_id));

revoke update on public.request_messages from authenticated;
grant update (read_at) on public.request_messages to authenticated;

create or replace function public.can_access_booking(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.requests r
    where r.id = target_booking_id
      and (
        r.client_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role = 'master'
            and p.master_slug = r.master_id
        )
      )
  );
$$;
revoke all on function public.can_access_booking(uuid) from public;
grant execute on function public.can_access_booking(uuid) to authenticated;

drop policy if exists "Linked masters read own reviews" on public.reviews;
create policy "Linked masters read own reviews"
  on public.reviews for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'master'
        and p.master_slug = reviews.master_id
    )
  );

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
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'master'
      and profile.master_slug = target.master_id
  ) then raise exception 'Недостатньо прав'; end if;
  update public.reviews
  set master_reply = trim(reply_text), master_replied_at = now(), updated_at = now()
  where id = review_id returning * into target;
  return target;
end;
$$;
revoke all on function public.reply_to_review(uuid, text) from public;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

select
  p.id,
  p.email,
  p.role,
  p.master_slug,
  m.user_id as matched_master_id
from public.profiles p
left join public.masters m
  on m.user_id = p.master_slug
where p.master_slug is not null;
