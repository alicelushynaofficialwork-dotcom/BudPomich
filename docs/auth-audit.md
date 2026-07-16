# Аудит регистрации, авторизации и ролей BudPomich

Дата аудита: 16 июля 2026 года.

Область аудита: Next.js 16.2.9, TypeScript, Supabase Auth/SSR, SQL-файлы в `supabase/`, реальные кабинеты и production `https://bud-pomich.vercel.app`. Demo Mode изучался только с точки зрения изоляции от реальных пользователей; его код и данные не изменялись.

## Краткий вывод

В проекте уже есть рабочая основа email/password Auth: формы регистрации, входа и запроса восстановления пароля, browser/server Supabase clients, cookie refresh через `proxy.ts`, таблица профилей и role-aware redirect после входа. Однако систему нельзя считать готовой к безопасной регистрации реальных пользователей до устранения нескольких блокирующих проблем:

1. В схеме нет `public.users`; фактическая таблица пользователя — `public.profiles`.
2. Пользователь может обновить поле `role` собственной строки `profiles`, включая повышение до `admin`.
3. `/client/dashboard` публичен, а `/dashboard` без `?role=` открывает master UI любой авторизованной роли.
4. Callback для email confirmation/PKCE отсутствует; password recovery не имеет callback и экрана установки нового пароля.
5. Кнопка выхода в master dashboard не вызывает существующий `signOut` action.
6. Реальные кабинеты пока показывают прототипные/статические данные и используют URL/localStorage наряду с ролью из БД.
7. Anonymous Demo Auth запускает общий trigger `auth.users -> profiles` и создаёт реальную строку `public.profiles` с ролью `client`.
8. `requests` и `messages` создаются SQL-файлом без RLS; их API не проверяют пользователя или принадлежность заявки.

## 1. Существующие Auth-страницы и компоненты

### Маршруты

| Маршрут | Состояние | Файл |
| --- | --- | --- |
| `/auth/login` | существует | `app/auth/login/page.tsx` |
| `/login` | alias/re-export `/auth/login` | `app/login/page.tsx` |
| `/auth/register` | существует | `app/auth/register/page.tsx` |
| `/register` | отсутствует | — |
| `/signup` | отсутствует | — |
| `/auth` | отдельная page отсутствует; есть layout | `app/auth/layout.tsx` |
| `/auth/callback` | отсутствует | production возвращает 404 |
| callback подтверждения email | отсутствует | — |
| callback восстановления пароля | отсутствует | — |
| экран задания нового пароля | отсутствует | — |

Auth-стили находятся в `app/auth/auth.css`.

### Формы и действия

- `components/RegisterForm.tsx` — выбор `client`, `master` или `contractor`, имя, телефон, email, пароль, город и согласие с условиями.
- `components/LoginForm.tsx` — вход email/password и переключаемая форма запроса password reset.
- `app/auth/actions.ts` — server actions `signInWithEmail`, `signUpWithEmail`, `resetPassword`, `signOut`.
- Реализован только вход email/password через `signInWithPassword`. OAuth, magic link, OTP и passkeys отсутствуют.
- `resetPasswordForEmail` вызывается, но без `redirectTo`; завершить recovery внутри приложения нельзя.
- Регистрация сообщает пользователю о необходимости подтвердить email, но приложение не обрабатывает callback.
- После регистрации redirect в кабинет отсутствует: форма показывает success и ссылку на `/auth/login` даже если `signUp` вернул активную session.
- После входа роль читается из `profiles`, затем выполняется redirect через `getDashboardPath`.

### Кнопки входа, регистрации и выхода

- «Увійти»: `components/Header.tsx`, `components/SiteHeader.tsx`, `app/auth/login/page.tsx`, `app/auth/register/page.tsx`.
- «Стати майстром»: `components/SiteHeader.tsx`, `app/about/page.tsx`; ссылки ведут на общую регистрацию.
- Другие registration CTA: `components/Footer.tsx`, `app/page.tsx`, demo-баннеры.
- В `components/DashboardMasterApp.tsx` есть визуальная кнопка «Вийти», но у неё нет `action`/`onClick`; существующий `signOut` нигде не импортирован и фактически недоступен из UI.
- «Запам'ятати мене» в `components/LoginForm.tsx` визуальный: checkbox не передаётся в action и не меняет срок session.

## 2. Supabase clients и работа с session

### Клиенты

- Browser client: `lib/supabase.ts`, `createBrowserClient`, использует только `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server client: `lib/supabase-server.ts`, `createServerClient`, читает/записывает cookies через `next/headers`.
- Proxy client: `proxy.ts`, отдельный `createServerClient`, переносит обновлённые Auth cookies в `NextResponse`.

Browser и server clients не являются нежелательными дублями: они предназначены для разных runtime. В `proxy.ts` повторяется конфигурация server client, что допустимо из-за API `NextRequest`/`NextResponse`, но общие env checks можно вынести в безопасный helper.

### Auth-вызовы

- `signUp`: `app/auth/actions.ts`.
- `signInWithPassword`: `app/auth/actions.ts`.
- `signOut`: `app/auth/actions.ts`, но UI его не вызывает.
- `resetPasswordForEmail`: `app/auth/actions.ts`.
- `getUser`: `proxy.ts`, API routes профиля/портфолио, server helpers Demo Mode и browser helpers Demo Mode.
- `getSession` не используется, что правильно для серверной авторизации: сервер доверяет `getUser`.
- `exchangeCodeForSession`, `verifyOtp`, `updateUser({ password })` отсутствуют.

### Cookies и refresh

`proxy.ts` вызывает `getUser` на всех matched requests и записывает обновлённые cookies в response. `lib/supabase-server.ts` корректно допускает невозможность записи cookies из Server Components. При этом редиректы, создаваемые после `getUser`, формируются новым `NextResponse.redirect`; код не переносит в redirect-response cookies, уже записанные в исходный `response`. Это потенциальный edge case refresh-а и требует интеграционного теста.

## 3. `public.users` и фактическая таблица профиля

### `public.users`

Ни в SQL, ни в TypeScript нет таблицы или обращений к `public.users`. Требования к `users` сейчас реализованы таблицей `public.profiles` из `supabase/migrations/20260704_create_auth_profiles.sql`. Перед дальнейшей разработкой нужно закрепить одно имя; создавать вторую таблицу `users` без необходимости не рекомендуется.

### Структура `public.profiles`

| Колонка | Тип/свойства |
| --- | --- |
| `id` | `uuid primary key references auth.users(id) on delete cascade` |
| `email` | `text not null` |
| `full_name` | `text`, nullable |
| `phone` | `text`, nullable |
| `avatar_url` | `text`, nullable |
| `role` | `public.user_role not null default 'client'` |
| `city` | `text`, nullable |
| `created_at` | `timestamptz not null default now()` |
| `updated_at` | `timestamptz not null default now()` |

Отдельной колонки `name` нет: используется `full_name`. Enum `public.user_role` поддерживает `client`, `master`, `contractor`, `admin`. TypeScript в `lib/auth.ts` повторяет эти четыре значения.

### Автоматическое создание профиля

Trigger `on_auth_user_created_create_profile` на `auth.users` вызывает `security definer` функцию `public.handle_new_user_profile()`. Она создаёт/обновляет `profiles`, берёт поля из `raw_user_meta_data`, допускает при создании только публичные роли `client`, `master`, `contractor` и заменяет прочее на `client`.

`signUpWithEmail` дополнительно делает `profiles.upsert`, дублируя trigger. Ошибка upsert игнорируется. При включённом email confirmation до появления session этот upsert будет заблокирован RLS, но trigger всё равно должен создать строку.

### RLS и политики

RLS включён. Есть политики:

- `Users can read own profile`: `select`, `auth.uid() = id`;
- `Users can update own profile`: `update`, `auth.uid() = id` в `using` и `with check`;
- `Users can insert own profile`: `insert`, `auth.uid() = id`.

Пользователь не может обновить чужую строку, но может изменить любые колонки своей строки. Так как `with check` проверяет только `id`, пользователь может через browser client изменить собственный `role` на `master`, `contractor` или `admin`. Это критическое повышение привилегий. Нужен запрет изменения роли обычными пользователями (отдельная RPC/admin policy, column privileges или trigger) и серверный workflow смены/одобрения роли.

## 4. Профильные таблицы и источники данных

### Найденные таблицы

- `profiles` — identity profile и роль.
- `master_profile_edits` — редактируемый публичный профиль мастера; `master_id text` является PK, `owner_id uuid references auth.users(id)` добавлен отдельной миграцией.
- `portfolio_items` — работы; `master_id text`, `owner_id uuid references auth.users(id)`.
- `portfolio_work_lines` — строки стоимости работы, связаны с `portfolio_items`.
- `master_services` — услуги, `master_id text`; в SQL нет FK на profile/auth user и нет RLS.
- `requests`, `request_additional_works`, `request_files`, `messages` — заявки/чат; identity основана на текстовых master/client полях, а не на FK к auth users.

Отдельные таблицы contractor profiles, client profiles, teams и subscriptions в репозитории отсутствуют. Полноценной contractor persistence нет; UI использует статические данные. Services существуют как `master_services` и как JSONB `master_profile_edits.services`, то есть уже есть два источника услуг.

### Связь `auth.users`, `profiles` и masters

- `auth.users.id` имеет строгую связь 1:1 только с `profiles.id`.
- `master_profile_edits.owner_id` и `portfolio_items.owner_id` ссылаются на `auth.users.id`.
- `master_profile_edits.master_id` и `portfolio_items.master_id` — произвольные текстовые slug/ID, без FK к `profiles`.
- Каталог мастеров и master dashboard получают базовые данные из статического `lib/masters.ts`; edits добавляются из Supabase и/или localStorage.
- Нет гарантии 1:1 между master-role profile и master slug. Зарегистрированный master не получает автоматически master record/slug.

### Несколько источников роли и профиля

- Каноническая роль для proxy/login: `profiles.role`.
- Запрошенная при signup роль: client-controlled hidden field и `auth.users.raw_user_meta_data.role`; trigger переносит её в `profiles.role`.
- Представление dashboard: URL `?role=client|contractor`, затем prop `defaultRole`.
- Master identity/profile: статический `lib/masters.ts`, `master_profile_edits`, localStorage key `budpomich.master-profile-edits` и query `masterId` на отдельных страницах.

Таким образом, роль из БД используется для части redirect/guard, но UI и данные кабинета всё ещё могут определяться URL, статическим ID и localStorage.

## 5. Реальные кабинеты и маршрутизация по ролям

### Маршруты

| Роль | Предполагаемый маршрут | Фактическая реализация |
| --- | --- | --- |
| client | `/dashboard?role=client` | `app/dashboard/page.tsx` рендерит `ClientCabinetApp` через `DashboardMasterApp` |
| master | `/dashboard` | `app/dashboard/page.tsx`, master prototype на статическом `andrey-ponomarenko` |
| contractor | `/dashboard?role=contractor` | тот же page, рендерит `ContractorCabinetApp` |

Есть второй client route `/client/dashboard` (`app/client/dashboard/page.tsx`), который рендерит тот же `ClientCabinetApp`, но не защищён. Production HTTP-проверка подтвердила 200 без Auth. Его нужно либо защитить и сделать каноническим, либо убрать из real Auth flow в пользу `/dashboard?role=client`.

### Guard в `proxy.ts`

Защищены только `/dashboard`, `/dashboard/*` и `/admin*`. Неавторизованный `/dashboard` в production получает 307 на `/auth/login?next=%2Fdashboard`.

Проблемы role guard:

- client может открыть `/dashboard` без query. Proxy не перенаправляет, page выбирает `master` по умолчанию.
- contractor также может открыть `/dashboard` и получить master UI.
- master не может открыть `?role=contractor`, contractor не может открыть `?role=client`: эти mismatches proxy перенаправляет.
- `/dashboard/profile`, `/dashboard/portfolio/*`, `/dashboard/promotion` проверяют только наличие пользователя, но не master-role. Client/contractor могут открыть master-only routes.
- `/client/dashboard` доступен всем.
- `next` query при login сохраняется proxy, но `signInWithEmail` его не читает; после входа всегда используется role dashboard.

Страницы кабинетов не загружают текущий profile/master по `user.id`: master фиксирован как `andrey-ponomarenko`, contractor — статический prototype, client — prototype/static masters.

## 6. Безопасность

### Критические/высокие риски

1. **Самостоятельная смена роли/получение admin.** Политика update `profiles` не защищает `role`.
2. **Обход role authorization.** `/dashboard` без query и master-only child routes доступны любой authenticated role; `/client/dashboard` публичен.
3. **Заявки и сообщения без ownership/RLS.** SQL `supabase/budpomich_requests_schema.sql` не включает RLS для `requests`, `messages`, `master_services` и дочерних таблиц. API routes `app/api/requests/route.ts` и `app/api/messages/route.ts` не требуют Auth: позволяют читать все записи, менять статус произвольной заявки и отправлять сообщение от выбранной в payload роли.
4. **Anonymous Demo создаёт real profile row.** Общий trigger не исключает `auth.users.is_anonymous`; anonymous user получает `profiles` с пустым email и ролью client. Удаление старого anonymous auth user через cron позже удалит profile cascade, но до этого реальные и demo identities смешаны в `profiles`.

### Средние риски и пробелы

- Политики master profile/portfolio проверяют owner, но не требуют `profiles.role = 'master'`: любой authenticated client/contractor может создавать master content под новым текстовым `master_id`.
- Signup позволяет самостоятельно выбрать `master`/`contractor`; если эти роли должны требовать модерацию, сейчас её нет.
- `profiles.email` не имеет unique constraint и login lookup идёт по email, а не `user.id`. RLS обычно скроет чужие строки, но корректнее получать profile по authenticated UUID.
- Ошибка `profiles.upsert` после signup игнорируется.
- GET публичного master profile возвращает данные всем, что ожидаемо для каталога, однако contact/privacy boundaries требуют явной модели.
- Server API использует anon client и полагается на RLS; service role в runtime-коде не найден.
- SQL-комментарий в старой portfolio migration упоминает `SUPABASE_SERVICE_ROLE_KEY`, но ключ не используется и не хранится в репозитории.
- Значения секретов не обнаружены в tracked source. `.gitignore` исключает `.env*` и `.vercel`.

### Demo Mode

- Demo state хранится отдельно в `demo_sessions`, а реальные profile/portfolio routes его не используют.
- SQL создания `demo_sessions`/`demo_templates` и их RLS policies отсутствует в репозитории, поэтому полноту database-level изоляции нельзя подтвердить по version-controlled migrations.
- Если реальный пользователь уже вошёл, `startDemoSession` использует его существующую session и не вызывает anonymous sign-in/signOut. Поэтому открытие Demo Mode само по себе не должно уничтожать зарегистрированную session.
- Но demo session тогда привязывается к реальному `user.id`; это допустимо только при строгом разделении таблиц и RLS.
- Если Auth session отсутствует, Demo Mode создаёт anonymous `auth.users`; общий profile trigger создаёт запись в `profiles`, что необходимо исправить без изменения поведения demo-кабинетов.

## 7. Production-конфигурация

### Подтверждено HTTP-проверкой `https://bud-pomich.vercel.app`

- `/` — 200.
- `/auth/login` — 200.
- `/auth/register` — 200.
- `/auth/callback` — 404.
- `/client/dashboard` — 200 без Auth.
- `/dashboard` — 307 на `/auth/login?next=%2Fdashboard` без Auth.

### Переменные

Локально присутствуют только имена (значения не читались в отчёт и не приводятся):

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

Runtime-код также не ожидает service role key. Репозиторий не позволяет подтвердить, какие переменные реально настроены в Vercel environments; это нужно проверить в Vercel Project Settings для Production и Preview. Необходимо сохранить публичные Supabase URL/anon key и Turnstile site key, а секрет Turnstile — только в server environment, если его проверка выполняется на сервере. Service role key нельзя делать `NEXT_PUBLIC_*`.

### Supabase Auth URL configuration

Из репозитория нельзя проверить dashboard Supabase. Перед запуском необходимо вручную подтвердить:

- Site URL: `https://bud-pomich.vercel.app`;
- Redirect URLs как минимум `https://bud-pomich.vercel.app/auth/callback` и нужные Preview patterns;
- email confirmation policy и шаблон, ведущий на callback;
- recovery redirect на route установки нового пароля;
- отсутствие localhost-only redirect в production.

Сейчас callback route и update-password UI отсутствуют, поэтому email confirmation/recovery flow не готов независимо от dashboard settings.

## 8. Что можно переиспользовать

- `lib/supabase.ts`, `lib/supabase-server.ts` и cookie refresh pattern в `proxy.ts`.
- Формы `RegisterForm` и `LoginForm`, server actions и базовую валидацию.
- Enum `public.user_role`, `profiles` 1:1 с `auth.users`, trigger создания profile.
- `lib/auth.ts` после закрепления канонических маршрутов.
- Общие UI-компоненты `ClientCabinetApp`, `DashboardMasterApp`, `ContractorCabinetApp` после подключения к текущему user/profile.
- Owner-based модель `owner_id` для portfolio и profile edits после добавления role checks и строгого master identity.

## 9. Что необходимо создать или изменить

1. Новая security migration: запрет self-update `role`; исключение anonymous users из real profiles либо отдельная маркировка/таблица; role-aware policies; RLS/ownership для requests/messages/services; version-controlled schema Demo tables/policies.
2. Callback route для Supabase code exchange/confirmation и recovery route с `updateUser({ password })`.
3. Единый server helper текущего user/profile/role и строгий role guard для каждого кабинета и master-only subroute.
4. Каноническое сопоставление auth user с master/contractor profile; автоматическое создание role-specific profile после подтверждения/одобрения.
5. Рабочий logout UI и корректная обработка `next`/post-signup redirect.
6. Замена статического пользователя, URL role и localStorage как источников прав на данные, загружаемые по `auth.uid()`.

## 10. Файлы, которые вероятно потребуется изменить

Список для будущей реализации; в рамках аудита они не изменялись:

- `supabase/migrations/<new_auth_role_security_migration>.sql`;
- `supabase/budpomich_requests_schema.sql` или новая нормализующая migration;
- `app/auth/actions.ts`;
- `app/auth/callback/route.ts` (новый);
- `app/auth/update-password/page.tsx` и связанная форма (новые, только если выбран этот URL);
- `lib/auth.ts`;
- `lib/supabase-server.ts` и/или новый server-only auth helper;
- `proxy.ts`;
- `app/dashboard/page.tsx`;
- `app/dashboard/layout.tsx` и master-only layouts/routes;
- `app/client/dashboard/page.tsx` (защитить или убрать как дублирующий entry point);
- `components/DashboardMasterApp.tsx` (logout и удаление role switch из real mode);
- `components/RegisterForm.tsx`;
- `components/LoginForm.tsx`;
- `app/api/requests/route.ts`;
- `app/api/messages/route.ts`;
- `app/api/profile/route.ts`;
- `app/api/portfolio/route.ts`.

Demo routes/components менять не требуется. Изменение trigger/policies должно сохранить их UI и state contract.

## 11. Точный порядок реализации регистрации (максимум 5 шагов)

1. **Закрыть базу:** migration с неизменяемой пользователем ролью, role-aware RLS, ownership для requests/messages/services и исключением anonymous identities из real profiles; зафиксировать schema Demo tables/policies.
2. **Завершить Auth lifecycle:** добавить callback, email confirmation, recovery/update-password, обработку ошибок signup и рабочий signOut; настроить Supabase Site/Redirect URLs и Vercel env.
3. **Сделать единый authorization layer:** получать user/profile по UUID, определить канонические role routes, закрыть `/client/dashboard` и все master-only/contractor-only маршруты, устранить влияние URL на права.
4. **Связать role profiles:** создать стабильную связь auth user с master/contractor/client domain profile и перевести кабинеты/API со статических данных/localStorage на owner-scoped Supabase records.
5. **Проверить end-to-end:** signup каждого типа, confirmation, login/logout, reset, истечение/refresh cookies, прямые URL cross-role, RLS negative tests, coexistence зарегистрированной и anonymous Demo sessions, затем deploy checklist.

## 12. Результаты проверок проекта

### `npm run lint`

Успешно, exit code 0: 0 errors, 35 warnings. Предупреждения уже присутствуют в компонентах и относятся к unused variables, `<img>` вместо `next/image` и одному missing dependency в `useEffect`; аудит Auth новых предупреждений не добавляет.

### `npm run build`

Успешно, exit code 0. Next.js 16.2.9/Turbopack: compilation, TypeScript, page data и генерация 56 static pages завершены. Build route list подтверждает `/auth/login`, `/auth/register`, `/login`, `/client/dashboard`, `/dashboard` и отсутствие `/auth/callback`, `/register`, `/signup`.

## Итоговая оценка готовности

UI и базовый Supabase SSR plumbing можно переиспользовать, но production-регистрацию реальных пользователей следует считать **не готовой** до устранения privilege escalation через `profiles.role`, закрытия role routes и заявок/сообщений, добавления callback/recovery flow и создания стабильной связи auth user с role-specific domain profile.
