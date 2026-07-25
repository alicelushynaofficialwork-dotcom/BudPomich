import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260725_align_master_portfolio_production_schema.sql",
  import.meta.url,
);
const migration = await readFile(migrationUrl, "utf8");

test("alignment migration is transactional, additive, and idempotent", () => {
  assert.match(migration, /^\s*begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /create table if not exists public\.master_profile_edits/i);
  assert.match(migration, /create table if not exists public\.portfolio_items/i);
  assert.match(migration, /create table if not exists public\.portfolio_work_lines/i);
  assert.match(migration, /add column if not exists master_slug text/i);
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
});

test("master_slug is unique, URL-safe, role-bound, and protected", () => {
  assert.match(migration, /create unique index if not exists profiles_master_slug_unique/i);
  assert.match(migration, /master_slug\s*!~\s*'\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/i);
  assert.match(migration, /check\s*\(master_slug is null or role = 'master'\)/i);
  assert.match(migration, /profile master_slug can only be changed by a trusted administrative workflow/i);
  assert.match(migration, /revoke update \(master_slug\) on public\.profiles from authenticated/i);
});

test("linked masters receive a compatible public profile without overwriting profile content", () => {
  assert.match(migration, /insert into public\.master_profile_edits[\s\S]*from public\.profiles as profile/i);
  assert.match(migration, /profile\.role = 'master'[\s\S]*profile\.master_slug is not null/i);
  assert.match(
    migration,
    /on conflict \(master_id\) do update\s+set owner_id = coalesce\(public\.master_profile_edits\.owner_id, excluded\.owner_id\)/i,
  );
});

test("profile and portfolio writes use the canonical profiles.master_slug link", () => {
  assert.match(
    migration,
    /profile\.id = auth\.uid\(\)[\s\S]*profile\.role = 'master'[\s\S]*profile\.master_slug = master_profile_edits\.master_id/i,
  );
  assert.match(
    migration,
    /profile\.id = auth\.uid\(\)[\s\S]*profile\.role = 'master'[\s\S]*profile\.master_slug = portfolio_items\.master_id/i,
  );
  assert.match(migration, /item\.owner_id = auth\.uid\(\)/i);
});

test("request status and master messages remain authorized by profiles.master_slug", () => {
  assert.match(
    migration,
    /create policy "Masters can update profile requests"[\s\S]*profile\.master_slug = requests\.master_id/i,
  );
  assert.match(
    migration,
    /create policy "Linked masters read request messages"[\s\S]*profile\.master_slug = request\.master_id/i,
  );
  assert.match(
    migration,
    /create policy "Linked masters insert request messages"[\s\S]*sender_id = auth\.uid\(\)[\s\S]*sender_role = 'master'/i,
  );
});

test("portfolio API columns and work-line relation are present", () => {
  for (const column of [
    "master_id",
    "owner_id",
    "title",
    "description",
    "city",
    "object_type",
    "photo_url",
    "total_amount",
    "meta",
    "created_at",
  ]) {
    assert.match(migration, new RegExp(`add column if not exists ${column}\\b`, "i"));
  }

  assert.match(
    migration,
    /foreign key \(portfolio_item_id\) references public\.portfolio_items\(id\)[\s\S]*on delete cascade/i,
  );
});
