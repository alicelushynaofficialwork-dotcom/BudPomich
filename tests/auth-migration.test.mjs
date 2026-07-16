import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260716_secure_auth_roles_and_anonymous_profiles.sql",
  import.meta.url,
);
const migration = await readFile(migrationUrl, "utf8");

test("anonymous auth users are excluded from profile creation", () => {
  assert.match(migration, /coalesce\(new\.is_anonymous, false\)/i);
  assert.match(migration, /return new;/i);
  assert.match(migration, /auth\.jwt\(\)\s*->>\s*'is_anonymous'/i);
});

test("authenticated users cannot update the role column", () => {
  assert.match(migration, /revoke update on table public\.profiles from authenticated/i);
  assert.match(
    migration,
    /grant update \(full_name, phone, city, avatar_url\)\s+on table public\.profiles to authenticated/i,
  );
  assert.doesNotMatch(migration, /grant update \([^)]*role[^)]*\).*authenticated/i);
});

test("role changes are protected by a database trigger", () => {
  assert.match(migration, /before update of role on public\.profiles/i);
  assert.match(
    migration,
    /raise exception 'profile role can only be changed by a trusted administrative workflow'/i,
  );
});
