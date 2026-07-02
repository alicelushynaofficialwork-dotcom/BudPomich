alter table portfolio_items
  add column if not exists meta jsonb default '{}'::jsonb;
