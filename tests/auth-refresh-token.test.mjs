import assert from "node:assert/strict";
import test from "node:test";

import {
  isInvalidRefreshTokenError,
  isSupabaseAuthCookie,
} from "../lib/supabase-auth-error.ts";

test("recognizes refresh-token failures returned by Supabase Auth", () => {
  assert.equal(isInvalidRefreshTokenError({ code: "refresh_token_not_found" }), true);
  assert.equal(isInvalidRefreshTokenError({ code: "refresh_token_already_used" }), true);
  assert.equal(
    isInvalidRefreshTokenError({ message: "Invalid Refresh Token: Refresh Token Not Found" }),
    true,
  );
  assert.equal(isInvalidRefreshTokenError({ code: "bad_jwt" }), false);
});

test("matches only the current Supabase project's session cookie chunks", () => {
  const url = "https://project-ref.supabase.co";

  assert.equal(isSupabaseAuthCookie("sb-project-ref-auth-token", url), true);
  assert.equal(isSupabaseAuthCookie("sb-project-ref-auth-token.0", url), true);
  assert.equal(isSupabaseAuthCookie("sb-project-ref-auth-token.12", url), true);
  assert.equal(isSupabaseAuthCookie("sb-other-project-auth-token", url), false);
  assert.equal(isSupabaseAuthCookie("unrelated-cookie", url), false);
});
