import assert from "node:assert/strict";
import test from "node:test";

import { completeEmailConfirmation, getSafeConfirmationNext } from "../lib/auth-confirmation.ts";
import { getDashboardPath } from "../lib/auth.ts";

function createConfirmationClient({ verifyError = null, user = null, profile = null, insertError = null } = {}) {
  const calls = { verifyOtp: [], insert: [] };
  return {
    calls,
    client: {
      auth: {
        async verifyOtp(params) {
          calls.verifyOtp.push(params);
          return { data: {}, error: verifyError };
        },
        async getUser() {
          return { data: { user }, error: null };
        },
      },
      from() {
        return {
          select() {
            return { eq() { return { async maybeSingle() { return { data: profile, error: null }; } }; } };
          },
          async insert(values) {
            calls.insert.push(values);
            return { data: null, error: insertError };
          },
        };
      },
    },
  };
}

test("confirmation next accepts only internal paths", () => {
  assert.equal(getSafeConfirmationNext("/dashboard"), "/dashboard");
  assert.equal(getSafeConfirmationNext("https://evil.example"), "/auth/confirmed");
  assert.equal(getSafeConfirmationNext("//evil.example"), "/auth/confirmed");
  assert.equal(getSafeConfirmationNext(null), "/auth/confirmed");
});

test("successful verifyOtp keeps the authenticated session and existing profile", async () => {
  const user = { id: "user-1", email: "master@example.com", user_metadata: { role: "master" } };
  const { client, calls } = createConfirmationClient({ user, profile: { id: user.id } });
  const result = await completeEmailConfirmation(client, "token", "signup");

  assert.equal(result.ok, true);
  assert.deepEqual(calls.verifyOtp, [{ token_hash: "token", type: "signup" }]);
  assert.equal(calls.insert.length, 0);
});

test("verifyOtp error without an existing session fails cleanly", async () => {
  const { client } = createConfirmationClient({ verifyError: { message: "expired" } });
  const result = await completeEmailConfirmation(client, "expired-token", "signup");
  assert.deepEqual(result, { ok: false, reason: "verification_failed" });
});

test("missing profile is restored from authenticated user metadata", async () => {
  const user = {
    id: "user-2",
    email: "client@example.com",
    user_metadata: { full_name: "Олена Коваль", phone: "+380", city: "Київ", role: "client" },
  };
  const { client, calls } = createConfirmationClient({ user });
  const result = await completeEmailConfirmation(client, "token", "email");

  assert.equal(result.ok, true);
  assert.equal(calls.insert.length, 1);
  assert.equal(calls.insert[0].role, "client");
  assert.equal(calls.insert[0].full_name, "Олена Коваль");
});

test("confirmed master is routed by the existing dashboard role logic", () => {
  assert.equal(getDashboardPath("master"), "/dashboard");
});
