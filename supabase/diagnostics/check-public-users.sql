-- Read-only production diagnostics for public.users.
-- Run each query manually in the Supabase SQL editor when verification is needed.

-- Columns, data types, nullability, and defaults.
select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  ordinal_position
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
order by ordinal_position;

-- Row-level security state.
select
  n.nspname as table_schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class as c
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'users'
  and c.relkind in ('r', 'p');

-- Row-level security policies.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'users'
order by policyname;

-- Primary key, foreign key, unique, and check constraints.
select
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_catalog.pg_get_constraintdef(con.oid, true) as definition,
  con.convalidated as is_validated
from pg_catalog.pg_constraint as con
join pg_catalog.pg_class as rel on rel.oid = con.conrelid
join pg_catalog.pg_namespace as n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname = 'users'
order by con.contype, con.conname;

-- Indexes.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename = 'users'
order by indexname;

-- User-defined triggers (internal constraint triggers are excluded).
select
  trigger_schema,
  event_object_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'users'
order by trigger_name, event_manipulation;

-- Aggregate role distribution. No user identifiers or email addresses are returned.
select
  role,
  count(*) as user_count
from public.users
group by role
order by role;
