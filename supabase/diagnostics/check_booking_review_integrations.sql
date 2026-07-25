-- Diagnostics for booking/review integration compatibility.

SELECT 'tables' AS check_type, 'public.master_profile_edits' AS object_name,
       to_regclass('public.master_profile_edits') IS NOT NULL AS exists;
SELECT 'tables' AS check_type, 'public.portfolio_items' AS object_name,
       to_regclass('public.portfolio_items') IS NOT NULL AS exists;
SELECT 'tables' AS check_type, 'public.portfolio_work_lines' AS object_name,
       to_regclass('public.portfolio_work_lines') IS NOT NULL AS exists;
SELECT 'tables' AS check_type, 'public.requests' AS object_name,
       to_regclass('public.requests') IS NOT NULL AS exists;
SELECT 'tables' AS check_type, 'public.reviews' AS object_name,
       to_regclass('public.reviews') IS NOT NULL AS exists;
SELECT 'tables' AS check_type, 'public.booking_attachments' AS object_name,
       to_regclass('public.booking_attachments') IS NOT NULL AS exists;

SELECT 'columns' AS check_type,
       c.table_name,
       c.column_name,
       EXISTS (
         SELECT 1
         FROM information_schema.columns ic
         WHERE ic.table_schema = c.table_schema
           AND ic.table_name = c.table_name
           AND ic.column_name = c.column_name
       ) AS exists
FROM (VALUES
  ('public', 'profiles', 'master_slug'),
  ('public', 'master_profile_edits', 'owner_id'),
  ('public', 'master_profile_edits', 'avatar_url'),
  ('public', 'master_profile_edits', 'contacts'),
  ('public', 'master_profile_edits', 'verification'),
  ('public', 'portfolio_items', 'master_id'),
  ('public', 'portfolio_items', 'owner_id'),
  ('public', 'portfolio_items', 'meta'),
  ('public', 'portfolio_work_lines', 'portfolio_item_id'),
  ('public', 'portfolio_work_lines', 'total'),
  ('public', 'requests', 'source'),
  ('public', 'requests', 'confirmed_period'),
  ('public', 'reviews', 'booking_id'),
  ('public', 'reviews', 'project_id'),
  ('public', 'booking_attachments', 'storage_path')
) AS c(table_schema, table_name, column_name)
ORDER BY c.table_name, c.column_name;

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'master_profile_edits',
    'portfolio_items',
    'portfolio_work_lines',
    'requests',
    'request_messages',
    'reviews',
    'booking_attachments'
  )
ORDER BY tablename;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'master_profile_edits',
    'portfolio_items',
    'portfolio_work_lines',
    'requests',
    'request_messages',
    'reviews',
    'booking_attachments'
  )
ORDER BY tablename, policyname;

SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('can_access_booking', 'reply_to_review')
ORDER BY p.proname;

SELECT 'functions' AS check_type,
       'public.can_access_booking(uuid)' AS object_name,
       to_regprocedure('public.can_access_booking(uuid)') IS NOT NULL AS exists;

SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'booking-attachments';

SELECT COUNT(*) AS master_profile_edits_without_owner_id
FROM public.master_profile_edits
WHERE owner_id IS NULL;

SELECT master_slug, COUNT(*) AS linked_profiles
FROM public.profiles
WHERE master_slug IS NOT NULL
GROUP BY master_slug
HAVING COUNT(*) > 1;

SELECT id, role, master_slug
FROM public.profiles
WHERE master_slug IS NOT NULL
  AND (
    role <> 'master'
    OR master_slug <> lower(master_slug)
    OR master_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );

SELECT profile.id, profile.master_slug
FROM public.profiles AS profile
LEFT JOIN public.master_profile_edits AS edit
  ON edit.master_id = profile.master_slug
WHERE profile.role = 'master'
  AND profile.master_slug IS NOT NULL
  AND edit.master_id IS NULL;

SELECT item.id, item.master_id, item.owner_id
FROM public.portfolio_items AS item
LEFT JOIN public.profiles AS profile
  ON profile.id = item.owner_id
 AND profile.role = 'master'
 AND profile.master_slug = item.master_id
WHERE item.master_id IS NOT NULL
  AND profile.id IS NULL;
