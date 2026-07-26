-- Предварительная диагностика перед master/portfolio migration.
-- Только SELECT. Файл не изменяет данные, схему, RLS или политики.
--
-- Все обращения к необязательным таблицам выполняются через query_to_xml().
-- Если таблицы/колонки нет, query_to_xml() получает безопасный запрос-заглушку,
-- который не содержит ссылки на отсутствующий объект.

-- ============================================================================
-- 01. Наличие проверяемых таблиц
-- ============================================================================
SELECT
  '01. Наличие проверяемых таблиц' AS section,
  required.table_name,
  CASE
    WHEN to_regclass(format('public.%I', required.table_name)) IS NULL
      THEN 'MISSING'
    ELSE 'PRESENT'
  END AS status
FROM (
  VALUES
    ('profiles'),
    ('master_profile_edits'),
    ('portfolio_items'),
    ('portfolio_work_lines'),
    ('requests'),
    ('request_messages')
) AS required(table_name)
ORDER BY required.table_name;

-- ============================================================================
-- 02. Наличие profiles.master_slug и связанных идентификаторов
-- ============================================================================
SELECT
  '02. Наличие обязательных колонок' AS section,
  required.table_name,
  required.column_name,
  CASE
    WHEN to_regclass(format('public.%I', required.table_name)) IS NULL
      THEN 'TABLE_MISSING'
    WHEN columns.column_name IS NULL
      THEN 'MISSING'
    ELSE 'PRESENT'
  END AS status
FROM (
  VALUES
    ('profiles', 'id'),
    ('profiles', 'role'),
    ('profiles', 'master_slug'),
    ('master_profile_edits', 'master_id'),
    ('master_profile_edits', 'owner_id'),
    ('portfolio_items', 'id'),
    ('portfolio_items', 'master_id'),
    ('portfolio_items', 'owner_id'),
    ('portfolio_items', 'title'),
    ('portfolio_work_lines', 'portfolio_item_id'),
    ('portfolio_work_lines', 'work_type'),
    ('portfolio_work_lines', 'unit'),
    ('portfolio_work_lines', 'unit_price'),
    ('portfolio_work_lines', 'volume'),
    ('requests', 'master_id'),
    ('request_messages', 'master_id'),
    ('request_messages', 'request_id')
) AS required(table_name, column_name)
LEFT JOIN information_schema.columns AS columns
  ON columns.table_schema = 'public'
 AND columns.table_name = required.table_name
 AND columns.column_name = required.column_name
ORDER BY required.table_name, required.column_name;

-- ============================================================================
-- 03. Все существующие колонки проверяемых таблиц
-- ============================================================================
SELECT
  '03. Колонки проверяемых таблиц' AS section,
  columns.table_name,
  columns.ordinal_position,
  columns.column_name,
  columns.data_type,
  columns.udt_name,
  columns.is_nullable,
  columns.column_default,
  columns.is_generated,
  columns.generation_expression
FROM information_schema.columns AS columns
WHERE columns.table_schema = 'public'
  AND columns.table_name IN (
    'profiles',
    'master_profile_edits',
    'portfolio_items',
    'portfolio_work_lines',
    'requests',
    'request_messages'
  )
ORDER BY columns.table_name, columns.ordinal_position;

-- ============================================================================
-- 04. Точное количество строк
-- Отсутствующая таблица возвращает MISSING и NULL, а не ошибку.
-- ============================================================================
SELECT
  '04. Точное количество строк' AS section,
  target.table_name,
  CASE WHEN target.relation_oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status,
  CASE
    WHEN target.relation_oid IS NULL THEN NULL
    ELSE (
      (xpath('/table/row/row_count/text()', counts.result))[1]::text
    )::bigint
  END AS row_count
FROM (
  SELECT
    required.table_name,
    to_regclass(format('public.%I', required.table_name)) AS relation_oid
  FROM (
    VALUES
      ('profiles'),
      ('master_profile_edits'),
      ('portfolio_items'),
      ('portfolio_work_lines'),
      ('requests'),
      ('request_messages')
  ) AS required(table_name)
) AS target
CROSS JOIN LATERAL (
  SELECT query_to_xml(
    CASE
      WHEN target.relation_oid IS NULL
        THEN 'SELECT NULL::bigint AS row_count WHERE false'
      ELSE format('SELECT count(*) AS row_count FROM %s', target.relation_oid::regclass)
    END,
    false,
    true,
    ''
  ) AS result
) AS counts
ORDER BY target.table_name;

-- ============================================================================
-- 05. Внешние ключи
-- ============================================================================
SELECT
  '05. Внешние ключи' AS section,
  source_namespace.nspname AS table_schema,
  source_table.relname AS table_name,
  constraint_info.conname AS constraint_name,
  pg_get_constraintdef(constraint_info.oid, true) AS definition,
  constraint_info.convalidated AS is_validated
FROM pg_constraint AS constraint_info
JOIN pg_class AS source_table
  ON source_table.oid = constraint_info.conrelid
JOIN pg_namespace AS source_namespace
  ON source_namespace.oid = source_table.relnamespace
WHERE constraint_info.contype = 'f'
  AND source_namespace.nspname = 'public'
  AND source_table.relname IN (
    'profiles',
    'master_profile_edits',
    'portfolio_items',
    'portfolio_work_lines',
    'requests',
    'request_messages'
  )
ORDER BY source_table.relname, constraint_info.conname;

-- ============================================================================
-- 06. Индексы
-- ============================================================================
SELECT
  '06. Индексы' AS section,
  indexes.tablename AS table_name,
  indexes.indexname AS index_name,
  indexes.indexdef AS definition
FROM pg_indexes AS indexes
WHERE indexes.schemaname = 'public'
  AND indexes.tablename IN (
    'profiles',
    'master_profile_edits',
    'portfolio_items',
    'portfolio_work_lines',
    'requests',
    'request_messages'
  )
ORDER BY indexes.tablename, indexes.indexname;

-- ============================================================================
-- 07. Состояние RLS, включая отсутствующие таблицы
-- ============================================================================
SELECT
  '07. Состояние RLS' AS section,
  required.table_name,
  CASE
    WHEN table_info.oid IS NULL THEN 'MISSING'
    WHEN table_info.relrowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END AS status,
  table_info.relrowsecurity AS rls_enabled,
  table_info.relforcerowsecurity AS rls_forced
FROM (
  VALUES
    ('profiles'),
    ('master_profile_edits'),
    ('portfolio_items'),
    ('portfolio_work_lines'),
    ('requests'),
    ('request_messages')
) AS required(table_name)
LEFT JOIN (
  SELECT class_info.*
  FROM pg_class AS class_info
  JOIN pg_namespace AS namespace_info
    ON namespace_info.oid = class_info.relnamespace
  WHERE namespace_info.nspname = 'public'
    AND class_info.relkind IN ('r', 'p')
) AS table_info
  ON table_info.relname = required.table_name
ORDER BY required.table_name;

-- ============================================================================
-- 08. Действующие RLS-политики
-- ============================================================================
SELECT
  '08. Действующие RLS-политики' AS section,
  policies.tablename AS table_name,
  policies.policyname AS policy_name,
  policies.permissive,
  policies.roles,
  policies.cmd,
  policies.qual AS using_expression,
  policies.with_check AS with_check_expression
FROM pg_policies AS policies
WHERE policies.schemaname = 'public'
  AND policies.tablename IN (
    'profiles',
    'master_profile_edits',
    'portfolio_items',
    'portfolio_work_lines',
    'requests',
    'request_messages'
  )
ORDER BY policies.tablename, policies.cmd, policies.policyname;

-- ============================================================================
-- 09. profiles.master_slug: пустые, дубли, неверный формат и мастер Andrey
-- Колонка проверяется до формирования запроса к данным.
-- ============================================================================
WITH object_state AS MATERIALIZED (
  SELECT
    to_regclass('public.profiles') AS profiles_oid,
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'master_slug'
    ) AS has_master_slug
),
diagnostic AS MATERIALIZED (
  SELECT
    object_state.*,
    query_to_xml(
      CASE
        WHEN profiles_oid IS NULL OR NOT has_master_slug THEN
          'SELECT
             NULL::bigint AS blank_slug_rows,
             NULL::bigint AS duplicate_slug_groups,
             NULL::bigint AS invalid_slug_rows,
             NULL::bigint AS andrey_profiles
           WHERE false'
        ELSE format(
          $sql$
            SELECT
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(profile)->>'master_slug'), '') IS NULL
              ) AS blank_slug_rows,
              (
                SELECT count(*)
                FROM (
                  SELECT to_jsonb(duplicate_profile)->>'master_slug'
                  FROM %1$s AS duplicate_profile
                  WHERE nullif(btrim(to_jsonb(duplicate_profile)->>'master_slug'), '') IS NOT NULL
                  GROUP BY to_jsonb(duplicate_profile)->>'master_slug'
                  HAVING count(*) > 1
                ) AS duplicate_groups
              ) AS duplicate_slug_groups,
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(profile)->>'master_slug'), '') IS NOT NULL
                  AND (
                    to_jsonb(profile)->>'role' IS DISTINCT FROM 'master'
                    OR to_jsonb(profile)->>'master_slug'
                       <> lower(to_jsonb(profile)->>'master_slug')
                    OR (to_jsonb(profile)->>'master_slug')
                       !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                  )
              ) AS invalid_slug_rows,
              count(*) FILTER (
                WHERE to_jsonb(profile)->>'master_slug' = 'andrey-ponomarenko'
              ) AS andrey_profiles
            FROM %1$s AS profile
          $sql$,
          profiles_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS result
  FROM object_state
)
SELECT
  '09. Диагностика profiles.master_slug' AS section,
  CASE
    WHEN profiles_oid IS NULL THEN 'MISSING'
    WHEN NOT has_master_slug THEN 'MISSING'
    ELSE 'PRESENT'
  END AS status,
  CASE WHEN profiles_oid IS NOT NULL AND has_master_slug
    THEN ((xpath('/table/row/blank_slug_rows/text()', result))[1]::text)::bigint
  END AS blank_slug_rows,
  CASE WHEN profiles_oid IS NOT NULL AND has_master_slug
    THEN ((xpath('/table/row/duplicate_slug_groups/text()', result))[1]::text)::bigint
  END AS duplicate_slug_groups,
  CASE WHEN profiles_oid IS NOT NULL AND has_master_slug
    THEN ((xpath('/table/row/invalid_slug_rows/text()', result))[1]::text)::bigint
  END AS invalid_slug_rows,
  CASE WHEN profiles_oid IS NOT NULL AND has_master_slug
    THEN ((xpath('/table/row/andrey_profiles/text()', result))[1]::text)::bigint
  END AS andrey_profiles
FROM diagnostic;

-- ============================================================================
-- 10. Связанные с andrey-ponomarenko записи
-- Для каждой таблицы отдельно проверяются таблица и колонка master_id.
-- ============================================================================
SELECT
  '10. Связанные записи andrey-ponomarenko' AS section,
  target.table_name,
  CASE
    WHEN target.relation_oid IS NULL THEN 'MISSING'
    WHEN NOT target.has_link_column THEN 'COLUMN_MISSING'
    ELSE 'PRESENT'
  END AS status,
  CASE
    WHEN target.relation_oid IS NULL OR NOT target.has_link_column THEN NULL
    ELSE (
      (xpath('/table/row/related_count/text()', related.result))[1]::text
    )::bigint
  END AS related_count
FROM (
  SELECT
    required.table_name,
    required.link_column,
    to_regclass(format('public.%I', required.table_name)) AS relation_oid,
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = required.table_name
        AND column_name = required.link_column
    ) AS has_link_column
  FROM (
    VALUES
      ('master_profile_edits', 'master_id'),
      ('portfolio_items', 'master_id'),
      ('requests', 'master_id'),
      ('request_messages', 'master_id')
  ) AS required(table_name, link_column)
) AS target
CROSS JOIN LATERAL (
  SELECT query_to_xml(
    CASE
      WHEN target.relation_oid IS NULL OR NOT target.has_link_column THEN
        'SELECT NULL::bigint AS related_count WHERE false'
      ELSE format(
        'SELECT count(*) AS related_count
         FROM %s AS source
         WHERE to_jsonb(source)->>%L = %L',
        target.relation_oid::regclass,
        target.link_column,
        'andrey-ponomarenko'
      )
    END,
    false,
    true,
    ''
  ) AS result
) AS related
ORDER BY target.table_name;

-- ============================================================================
-- 11. Строки портфолио мастера Andrey
-- Запрос с JOIN создаётся только при наличии обеих таблиц и нужных колонок.
-- ============================================================================
WITH object_state AS MATERIALIZED (
  SELECT
    to_regclass('public.portfolio_items') AS items_oid,
    to_regclass('public.portfolio_work_lines') AS lines_oid,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portfolio_items'
        AND column_name IN ('id', 'master_id')
      GROUP BY table_schema, table_name
      HAVING count(DISTINCT column_name) = 2
    ) AS has_item_columns,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portfolio_work_lines'
        AND column_name = 'portfolio_item_id'
    ) AS has_line_column
),
diagnostic AS MATERIALIZED (
  SELECT
    object_state.*,
    query_to_xml(
      CASE
        WHEN items_oid IS NULL
          OR lines_oid IS NULL
          OR NOT has_item_columns
          OR NOT has_line_column
        THEN 'SELECT NULL::bigint AS related_count WHERE false'
        ELSE format(
          $sql$
            SELECT count(*) AS related_count
            FROM %1$s AS line
            JOIN %2$s AS item
              ON to_jsonb(item)->>'id' = to_jsonb(line)->>'portfolio_item_id'
            WHERE to_jsonb(item)->>'master_id' = 'andrey-ponomarenko'
          $sql$,
          lines_oid::regclass,
          items_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS result
  FROM object_state
)
SELECT
  '11. Строки портфолио andrey-ponomarenko' AS section,
  CASE
    WHEN items_oid IS NULL OR lines_oid IS NULL THEN 'MISSING'
    WHEN NOT has_item_columns OR NOT has_line_column THEN 'COLUMN_MISSING'
    ELSE 'PRESENT'
  END AS status,
  CASE
    WHEN items_oid IS NOT NULL
      AND lines_oid IS NOT NULL
      AND has_item_columns
      AND has_line_column
    THEN ((xpath('/table/row/related_count/text()', result))[1]::text)::bigint
  END AS related_work_lines
FROM diagnostic;

-- ============================================================================
-- 12. Данные, способные остановить миграцию
-- NULL означает, что соответствующую проверку нельзя выполнить из-за MISSING.
-- ============================================================================
WITH object_state AS MATERIALIZED (
  SELECT
    to_regclass('public.master_profile_edits') AS edits_oid,
    to_regclass('public.portfolio_items') AS items_oid,
    to_regclass('public.portfolio_work_lines') AS lines_oid,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'master_profile_edits'
        AND column_name = 'master_id'
    ) AS edits_has_master_id,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portfolio_items'
        AND column_name IN ('id', 'master_id', 'title')
      GROUP BY table_schema, table_name
      HAVING count(DISTINCT column_name) = 3
    ) AS items_have_required_columns,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portfolio_work_lines'
        AND column_name IN (
          'portfolio_item_id', 'work_type', 'unit', 'unit_price', 'volume'
        )
      GROUP BY table_schema, table_name
      HAVING count(DISTINCT column_name) = 5
    ) AS lines_have_required_columns
),
diagnostic AS MATERIALIZED (
  SELECT
    object_state.*,
    query_to_xml(
      CASE
        WHEN edits_oid IS NULL OR NOT edits_has_master_id THEN
          'SELECT
             NULL::bigint AS duplicate_master_ids,
             NULL::bigint AS blank_master_ids
           WHERE false'
        ELSE format(
          $sql$
            SELECT
              (
                SELECT count(*)
                FROM (
                  SELECT to_jsonb(edit)->>'master_id'
                  FROM %1$s AS edit
                  WHERE to_jsonb(edit)->>'master_id' IS NOT NULL
                  GROUP BY to_jsonb(edit)->>'master_id'
                  HAVING count(*) > 1
                ) AS duplicates
              ) AS duplicate_master_ids,
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(edit)->>'master_id'), '') IS NULL
              ) AS blank_master_ids
            FROM %1$s AS edit
          $sql$,
          edits_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS edits_result,
    query_to_xml(
      CASE
        WHEN items_oid IS NULL OR NOT items_have_required_columns THEN
          'SELECT
             NULL::bigint AS blank_master_ids,
             NULL::bigint AS blank_titles
           WHERE false'
        ELSE format(
          $sql$
            SELECT
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(item)->>'master_id'), '') IS NULL
              ) AS blank_master_ids,
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(item)->>'title'), '') IS NULL
              ) AS blank_titles
            FROM %1$s AS item
          $sql$,
          items_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS items_result,
    query_to_xml(
      CASE
        WHEN lines_oid IS NULL OR NOT lines_have_required_columns THEN
          'SELECT
             NULL::bigint AS blank_item_ids,
             NULL::bigint AS blank_work_types,
             NULL::bigint AS blank_units,
             NULL::bigint AS null_unit_prices,
             NULL::bigint AS null_volumes,
             NULL::bigint AS negative_unit_prices,
             NULL::bigint AS negative_volumes
           WHERE false'
        ELSE format(
          $sql$
            SELECT
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(line)->>'portfolio_item_id'), '') IS NULL
              ) AS blank_item_ids,
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(line)->>'work_type'), '') IS NULL
              ) AS blank_work_types,
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(line)->>'unit'), '') IS NULL
              ) AS blank_units,
              count(*) FILTER (
                WHERE to_jsonb(line)->>'unit_price' IS NULL
              ) AS null_unit_prices,
              count(*) FILTER (
                WHERE to_jsonb(line)->>'volume' IS NULL
              ) AS null_volumes,
              count(*) FILTER (
                WHERE (to_jsonb(line)->>'unit_price')::numeric < 0
              ) AS negative_unit_prices,
              count(*) FILTER (
                WHERE (to_jsonb(line)->>'volume')::numeric < 0
              ) AS negative_volumes
            FROM %1$s AS line
          $sql$,
          lines_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS lines_result
  FROM object_state
)
SELECT
  '12. Потенциальные блокеры данных' AS section,
  CASE WHEN edits_oid IS NULL THEN 'MISSING' ELSE 'CHECKED' END AS edits_status,
  CASE WHEN items_oid IS NULL THEN 'MISSING' ELSE 'CHECKED' END AS items_status,
  CASE WHEN lines_oid IS NULL THEN 'MISSING' ELSE 'CHECKED' END AS lines_status,
  CASE WHEN edits_oid IS NOT NULL AND edits_has_master_id
    THEN ((xpath('/table/row/duplicate_master_ids/text()', edits_result))[1]::text)::bigint
  END AS duplicate_edit_master_ids,
  CASE WHEN edits_oid IS NOT NULL AND edits_has_master_id
    THEN ((xpath('/table/row/blank_master_ids/text()', edits_result))[1]::text)::bigint
  END AS blank_edit_master_ids,
  CASE WHEN items_oid IS NOT NULL AND items_have_required_columns
    THEN ((xpath('/table/row/blank_master_ids/text()', items_result))[1]::text)::bigint
  END AS blank_item_master_ids,
  CASE WHEN items_oid IS NOT NULL AND items_have_required_columns
    THEN ((xpath('/table/row/blank_titles/text()', items_result))[1]::text)::bigint
  END AS blank_item_titles,
  CASE WHEN lines_oid IS NOT NULL AND lines_have_required_columns
    THEN ((xpath('/table/row/blank_item_ids/text()', lines_result))[1]::text)::bigint
  END AS blank_line_item_ids,
  CASE WHEN lines_oid IS NOT NULL AND lines_have_required_columns
    THEN ((xpath('/table/row/blank_work_types/text()', lines_result))[1]::text)::bigint
  END AS blank_line_work_types,
  CASE WHEN lines_oid IS NOT NULL AND lines_have_required_columns
    THEN ((xpath('/table/row/blank_units/text()', lines_result))[1]::text)::bigint
  END AS blank_line_units,
  CASE WHEN lines_oid IS NOT NULL AND lines_have_required_columns
    THEN ((xpath('/table/row/null_unit_prices/text()', lines_result))[1]::text)::bigint
  END AS null_line_unit_prices,
  CASE WHEN lines_oid IS NOT NULL AND lines_have_required_columns
    THEN ((xpath('/table/row/null_volumes/text()', lines_result))[1]::text)::bigint
  END AS null_line_volumes,
  CASE WHEN lines_oid IS NOT NULL AND lines_have_required_columns
    THEN ((xpath('/table/row/negative_unit_prices/text()', lines_result))[1]::text)::bigint
  END AS negative_line_unit_prices,
  CASE WHEN lines_oid IS NOT NULL AND lines_have_required_columns
    THEN ((xpath('/table/row/negative_volumes/text()', lines_result))[1]::text)::bigint
  END AS negative_line_volumes
FROM diagnostic;

-- ============================================================================
-- 13. Сиротские portfolio_work_lines.portfolio_item_id
-- ============================================================================
WITH object_state AS MATERIALIZED (
  SELECT
    to_regclass('public.portfolio_items') AS items_oid,
    to_regclass('public.portfolio_work_lines') AS lines_oid,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portfolio_items'
        AND column_name = 'id'
    ) AS items_have_id,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'portfolio_work_lines'
        AND column_name = 'portfolio_item_id'
    ) AS lines_have_item_id
),
diagnostic AS MATERIALIZED (
  SELECT
    object_state.*,
    query_to_xml(
      CASE
        WHEN items_oid IS NULL
          OR lines_oid IS NULL
          OR NOT items_have_id
          OR NOT lines_have_item_id
        THEN 'SELECT NULL::bigint AS orphan_rows WHERE false'
        ELSE format(
          $sql$
            SELECT count(*) AS orphan_rows
            FROM %1$s AS line
            LEFT JOIN %2$s AS item
              ON to_jsonb(item)->>'id' = to_jsonb(line)->>'portfolio_item_id'
            WHERE nullif(to_jsonb(line)->>'portfolio_item_id', '') IS NOT NULL
              AND to_jsonb(item)->>'id' IS NULL
          $sql$,
          lines_oid::regclass,
          items_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS result
  FROM object_state
)
SELECT
  '13. Сиротские строки портфолио' AS section,
  CASE
    WHEN items_oid IS NULL OR lines_oid IS NULL THEN 'MISSING'
    WHEN NOT items_have_id OR NOT lines_have_item_id THEN 'COLUMN_MISSING'
    ELSE 'CHECKED'
  END AS status,
  CASE
    WHEN items_oid IS NOT NULL
      AND lines_oid IS NOT NULL
      AND items_have_id
      AND lines_have_item_id
    THEN ((xpath('/table/row/orphan_rows/text()', result))[1]::text)::bigint
  END AS orphan_rows
FROM diagnostic;

-- ============================================================================
-- 14. Итоговый статус
--
-- READY           — целевые объекты уже существуют, структурных стоп-сигналов нет.
-- NEEDS_MIGRATION — отсутствуют создаваемые миграцией таблицы/колонки.
-- BLOCKED         — отсутствует profiles либо найдены slug-блокеры.
-- ============================================================================
WITH object_state AS MATERIALIZED (
  SELECT
    to_regclass('public.profiles') AS profiles_oid,
    to_regclass('public.master_profile_edits') AS edits_oid,
    to_regclass('public.portfolio_items') AS items_oid,
    to_regclass('public.portfolio_work_lines') AS lines_oid,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'master_slug'
    ) AS has_master_slug,
    EXISTS (
      SELECT 1
      FROM (
        VALUES
          ('master_profile_edits', 'master_id'),
          ('portfolio_items', 'id'),
          ('portfolio_items', 'master_id'),
          ('portfolio_work_lines', 'portfolio_item_id')
      ) AS required(table_name, column_name)
      WHERE to_regclass(format('public.%I', required.table_name)) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = required.table_name
            AND column_name = required.column_name
        )
    ) AS missing_target_columns,
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'master_profile_edits'
        AND column_name = 'master_id'
    ) AS edits_has_master_id
),
slug_diagnostic AS MATERIALIZED (
  SELECT
    object_state.*,
    query_to_xml(
      CASE
        WHEN profiles_oid IS NULL OR NOT has_master_slug THEN
          'SELECT
             0::bigint AS duplicate_slug_groups,
             0::bigint AS invalid_slug_rows'
        ELSE format(
          $sql$
            SELECT
              (
                SELECT count(*)
                FROM (
                  SELECT to_jsonb(duplicate_profile)->>'master_slug'
                  FROM %1$s AS duplicate_profile
                  WHERE nullif(btrim(to_jsonb(duplicate_profile)->>'master_slug'), '') IS NOT NULL
                  GROUP BY to_jsonb(duplicate_profile)->>'master_slug'
                  HAVING count(*) > 1
                ) AS duplicate_groups
              ) AS duplicate_slug_groups,
              count(*) FILTER (
                WHERE nullif(btrim(to_jsonb(profile)->>'master_slug'), '') IS NOT NULL
                  AND (
                    to_jsonb(profile)->>'role' IS DISTINCT FROM 'master'
                    OR to_jsonb(profile)->>'master_slug'
                       <> lower(to_jsonb(profile)->>'master_slug')
                    OR (to_jsonb(profile)->>'master_slug')
                       !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                  )
              ) AS invalid_slug_rows
            FROM %1$s AS profile
          $sql$,
          profiles_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS result,
    query_to_xml(
      CASE
        WHEN edits_oid IS NULL OR NOT edits_has_master_id THEN
          'SELECT 0::bigint AS duplicate_edit_master_ids'
        ELSE format(
          $sql$
            SELECT count(*) AS duplicate_edit_master_ids
            FROM (
              SELECT to_jsonb(edit)->>'master_id'
              FROM %1$s AS edit
              WHERE to_jsonb(edit)->>'master_id' IS NOT NULL
              GROUP BY to_jsonb(edit)->>'master_id'
              HAVING count(*) > 1
            ) AS duplicate_groups
          $sql$,
          edits_oid::regclass
        )
      END,
      false,
      true,
      ''
    ) AS edits_result
  FROM object_state
),
final_values AS MATERIALIZED (
  SELECT
    slug_diagnostic.*,
    ((xpath('/table/row/duplicate_slug_groups/text()', result))[1]::text)::bigint
      AS duplicate_slug_groups,
    ((xpath('/table/row/invalid_slug_rows/text()', result))[1]::text)::bigint
      AS invalid_slug_rows,
    ((xpath(
      '/table/row/duplicate_edit_master_ids/text()',
      edits_result
    ))[1]::text)::bigint AS duplicate_edit_master_ids
  FROM slug_diagnostic
)
SELECT
  '14. Итоговый статус' AS section,
  CASE
    WHEN profiles_oid IS NULL
      OR duplicate_slug_groups > 0
      OR invalid_slug_rows > 0
      OR duplicate_edit_master_ids > 0
      THEN 'BLOCKED'
    WHEN NOT has_master_slug
      OR edits_oid IS NULL
      OR items_oid IS NULL
      OR lines_oid IS NULL
      OR missing_target_columns
      THEN 'NEEDS_MIGRATION'
    ELSE 'READY'
  END AS status,
  CASE
    WHEN profiles_oid IS NULL
      THEN 'public.profiles отсутствует; целевая миграция не сможет продолжить работу'
    WHEN duplicate_slug_groups > 0
      THEN 'Найдены повторяющиеся profiles.master_slug'
    WHEN invalid_slug_rows > 0
      THEN 'Найдены некорректные profiles.master_slug или slug у профиля не-master'
    WHEN duplicate_edit_master_ids > 0
      THEN 'Найдены повторяющиеся master_profile_edits.master_id'
    WHEN NOT has_master_slug
      THEN 'profiles.master_slug отсутствует и должен быть добавлен миграцией'
    WHEN edits_oid IS NULL OR items_oid IS NULL OR lines_oid IS NULL
      THEN 'Одна или несколько целевых таблиц отсутствуют и должны быть созданы миграцией'
    WHEN missing_target_columns
      THEN 'В существующих целевых таблицах отсутствуют необходимые колонки'
    ELSE 'Автоматические структурные и slug-проверки пройдены'
  END AS reason,
  duplicate_slug_groups,
  invalid_slug_rows,
  duplicate_edit_master_ids
FROM final_values;
