-- Diagnostics for booking/review integration compatibility.

SELECT 'tables' AS check_type, 'public.master_profile_edits' AS object_name,
       to_regclass('public.master_profile_edits') IS NOT NULL AS exists;
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
  ('public', 'master_profile_edits', 'owner_id'),
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
  AND tablename IN ('master_profile_edits', 'requests', 'reviews', 'booking_attachments')
ORDER BY tablename;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('reviews', 'booking_attachments')
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
