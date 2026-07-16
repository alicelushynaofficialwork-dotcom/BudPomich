# Auth security — этап 1

Дата проверки: 16 июля 2026 года.

## Что исправлено

Этап закрывает две обнаруженные в аудите границы доверия: роль реального пользователя и разделение постоянных и анонимных Auth-пользователей Demo Mode.

- Источником роли для кабинета является только `public.profiles.role`, прочитанная на сервере по `auth.users.id`. Значение `?role=` больше не предоставляет доступ к интерфейсу другой роли.
- `proxy.ts` проверяет сессию и профиль для `/dashboard`, вложенных dashboard-маршрутов, legacy-маршрута `/client/dashboard` и `/admin`.
- Серверная страница `/dashboard` повторно сверяет канонический маршрут с ролью. Это не позволяет полагаться только на middleware/proxy.
- Разделы мастера `/dashboard/profile`, `/dashboard/portfolio` и `/dashboard/promotion` дополнительно защищены серверными layout-guard'ами.
- При отсутствующем/некорректном профиле пользователь направляется на login с безопасной ошибкой вместо неявного назначения роли `client`.
- Для неподдерживаемой роли `admin` используется безопасный маршрут login, а не кабинет клиента.
- `/client/dashboard` оставлен только как совместимый redirect в канонический кабинет текущего пользователя.
- В реальных кабинетах `client`, `master` и `contractor` подключён общий logout через `supabase.auth.signOut()`. Demo-интерфейсы logout не получили.

## Правила маршрутизации

| Роль из `public.profiles` | Канонический кабинет | Запрещённые варианты перенаправляются |
| --- | --- | --- |
| `client` | `/dashboard?role=client` | master/contractor UI и вложенные master-only маршруты → кабинет клиента |
| `master` | `/dashboard` | `?role=client`, `?role=contractor`, `/client/dashboard` → кабинет мастера |
| `contractor` | `/dashboard?role=contractor` | client/master UI и вложенные master-only маршруты → кабинет подрядчика |
| `admin` | отдельный кабинет отсутствует | → `/auth/login?error=unsupported_role` |

Неавторизованный запрос к защищённому маршруту перенаправляется на `/auth/login?next=...`. Demo-маршруты `/demo`, `/demo/client`, `/demo/master`, `/demo/contractor` не входят в защищённый matcher и не изменялись.

## Миграция Supabase

Добавлена миграция `supabase/migrations/20260716_secure_auth_roles_and_anonymous_profiles.sql`.

Она выполняет следующие изменения:

1. `handle_new_user_profile()` немедленно завершает работу для `auth.users.is_anonymous = true`. Новые анонимные Demo Auth-сессии больше не создают строку реального профиля.
2. INSERT policy профиля требует совпадения `auth.uid() = id` и запрещает JWT с `is_anonymous = true`.
3. У роли отозван клиентский UPDATE: роли `authenticated` разрешены только `full_name`, `phone`, `city`, `avatar_url`.
4. Trigger `profiles_prevent_untrusted_role_change` блокирует изменение `role` вне доверенного административного контекста. Разрешённые контексты: `postgres`, `service_role`, `supabase_admin`.
5. Существующие строки `profiles` намеренно не удаляются и не переписываются.

Таким образом, клиентский запрос может обновить разрешённые поля собственного профиля в рамках существующей row policy, но не `role`. Для будущей административной смены роли нужен отдельный проверяемый server-side workflow; на этом этапе он не создавался.

Миграция добавлена в репозиторий, но локальная проверка не применяла её к production Supabase. После deployment миграций следует выполнить интеграционные сценарии под реальными JWT: разрешённое обновление профиля, отказ изменения роли, создание email-профиля и отсутствие профиля после anonymous sign-in.

## Очистка старых анонимных профилей

Автоматическое удаление исторических данных не выполнялось. Перед ручной очисткой рекомендуется сначала просмотреть точный набор строк:

```sql
select p.id, p.created_at
from public.profiles as p
join auth.users as u on u.id = p.id
where u.is_anonymous is true
  and p.created_at < now() - interval '30 days'
order by p.created_at;
```

После проверки резервной копии и зависимых foreign key очистку можно выполнить отдельно:

```sql
delete from public.profiles as p
using auth.users as u
where u.id = p.id
  and u.is_anonymous is true
  and p.created_at < now() - interval '30 days';
```

Порог хранения нужно согласовать с фактической политикой Demo Mode. Этот SQL не является частью автоматической миграции.

## Изменённые файлы

- `supabase/migrations/20260716_secure_auth_roles_and_anonymous_profiles.sql` — DB-защита роли и исключение anonymous Auth из профилей.
- `lib/auth.ts`, `lib/auth-server.ts`, `proxy.ts` — канонические маршруты и server-side role guards.
- `app/dashboard/page.tsx`, `app/client/dashboard/page.tsx` — серверная проверка роли и legacy redirect.
- `app/dashboard/profile/layout.tsx`, `app/dashboard/portfolio/layout.tsx`, `app/dashboard/promotion/layout.tsx` — master-only guards.
- `app/auth/actions.ts`, `components/LogoutButton.tsx` — корректный server action выхода.
- `components/ClientCabinetApp.tsx`, `components/DashboardMasterApp.tsx`, `components/ContractorCabinetApp.tsx` и связанные CSS — подключение logout без изменения Demo Mode.
- `tests/auth-routing.test.mjs`, `tests/auth-migration.test.mjs`, `package.json` — локальные security regression tests.

## Проверки

- `npm run test:auth`: успешно, 8/8 тестов. Проверены канонические маршруты, перекрёстный доступ ролей, legacy/admin redirects и обязательные защитные конструкции SQL-миграции. Node вывел не блокирующее предупреждение `MODULE_TYPELESS_PACKAGE_JSON` при прямом импорте TypeScript-модуля тестом.
- `npm run lint`: успешно, 0 ошибок. Остались 35 ранее существовавших предупреждений (`no-unused-vars`, `no-img-element`, один `exhaustive-deps`) в файлах вне этого этапа.
- `npm run build`: успешно на Next.js 16.2.9; TypeScript и генерация 56 страниц завершились без ошибок. Demo и реальные dashboard-маршруты присутствуют в route manifest.

## Ограничения проверки

Автоматические тесты подтверждают прикладную маршрутизацию и статический контракт SQL. Полная проверка RLS и trigger требует применённой миграции и тестовых пользователей всех трёх ролей в целевой Supabase-среде. Секреты и содержимое `.env.local` в отчёт не копировались.
