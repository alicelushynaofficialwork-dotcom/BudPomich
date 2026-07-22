import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MASTER_PROFILE_NOT_LINKED, resolveAuthenticatedMasterIdentity } from "../lib/master-identity.ts";

function clientFor(profile, user = { id: "auth-master-1" }) {
  return {
    auth: { async getUser() { return { data: { user }, error: null }; } },
    from() {
      return {
        select() {
          return { eq() { return { async maybeSingle() { return { data: profile, error: null }; } }; } };
        },
      };
    },
  };
}

test("linked master identity resolves the public card slug from profiles", async () => {
  const result = await resolveAuthenticatedMasterIdentity(clientFor({
    id: "auth-master-1",
    email: "koronad99779977@gmail.com",
    role: "master",
    master_slug: "andrey-ponomarenko",
  }));
  assert.equal(result.ok, true);
  assert.equal(result.identity.authUserId, "auth-master-1");
  assert.equal(result.identity.profileId, "auth-master-1");
  assert.equal(result.identity.masterSlug, "andrey-ponomarenko");
});

test("master without a slug receives an explicit unlinked state", async () => {
  const result = await resolveAuthenticatedMasterIdentity(clientFor({
    id: "auth-master-1", email: "master@example.com", role: "master", master_slug: null,
  }));
  assert.deepEqual(result, { ok: false, code: MASTER_PROFILE_NOT_LINKED });
});

test("client and a different master cannot supply a browser slug to the resolver", async () => {
  const clientResult = await resolveAuthenticatedMasterIdentity(clientFor({
    id: "client-1", email: "alice@example.com", role: "client", master_slug: "andrey-ponomarenko",
  }, { id: "client-1" }));
  assert.deepEqual(clientResult, { ok: false, code: "NOT_MASTER" });

  const otherMaster = await resolveAuthenticatedMasterIdentity(clientFor({
    id: "auth-master-2", email: "other@example.com", role: "master", master_slug: "other-master",
  }, { id: "auth-master-2" }));
  assert.equal(otherMaster.ok, true);
  assert.equal(otherMaster.identity.masterSlug, "other-master");
});

test("RLS migration links requests, messages, and booking files through profiles.master_slug", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260721_link_auth_profile_to_master_slug.sql", import.meta.url), "utf8");
  assert.match(sql, /p\.id\s*=\s*auth\.uid\(\)[\s\S]*p\.master_slug\s*=\s*requests\.master_id/i);
  assert.match(sql, /sender_id\s*=\s*auth\.uid\(\)[\s\S]*sender_role\s*=\s*'master'/i);
  assert.match(sql, /p\.master_slug\s*=\s*r\.master_id/i);
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)/i);
});
