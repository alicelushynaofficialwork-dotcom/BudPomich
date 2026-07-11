alter table public.master_profile_edits
  add column if not exists owner_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.portfolio_items
  add column if not exists owner_id uuid references auth.users(id) on delete cascade default auth.uid();

create policy "Authenticated masters can create their profile edits"
  on public.master_profile_edits
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Profile owners can update their profile edits"
  on public.master_profile_edits
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Authenticated masters can create portfolio items"
  on public.portfolio_items
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Portfolio owners can update portfolio items"
  on public.portfolio_items
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Portfolio owners can delete portfolio items"
  on public.portfolio_items
  for delete
  to authenticated
  using (owner_id = auth.uid());

create policy "Portfolio owners can create work lines"
  on public.portfolio_work_lines
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.portfolio_items item
      where item.id = portfolio_item_id
        and item.owner_id = auth.uid()
    )
  );

create policy "Portfolio owners can update work lines"
  on public.portfolio_work_lines
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.portfolio_items item
      where item.id = portfolio_item_id
        and item.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.portfolio_items item
      where item.id = portfolio_item_id
        and item.owner_id = auth.uid()
    )
  );

create policy "Portfolio owners can delete work lines"
  on public.portfolio_work_lines
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.portfolio_items item
      where item.id = portfolio_item_id
        and item.owner_id = auth.uid()
    )
  );
