import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardPath, getDashboardRedirect } from "../lib/auth.ts";

test("canonical dashboard paths are derived only from the stored role", () => {
  assert.equal(getDashboardPath("client"), "/dashboard?role=client");
  assert.equal(getDashboardPath("master"), "/dashboard");
  assert.equal(getDashboardPath("contractor"), "/dashboard?role=contractor");
  assert.equal(getDashboardPath("admin"), "/auth/login?error=unsupported_role");
});

test("client cannot open master, contractor, or master-only dashboard UI", () => {
  assert.equal(getDashboardRedirect("client", "/dashboard", null), "/dashboard?role=client");
  assert.equal(getDashboardRedirect("client", "/dashboard", "contractor"), "/dashboard?role=client");
  assert.equal(getDashboardRedirect("client", "/dashboard/profile", null), "/dashboard?role=client");
  assert.equal(getDashboardRedirect("client", "/dashboard", "client"), null);
});

test("master cannot open client or contractor UI", () => {
  assert.equal(getDashboardRedirect("master", "/dashboard", "client"), "/dashboard");
  assert.equal(getDashboardRedirect("master", "/dashboard", "contractor"), "/dashboard");
  assert.equal(getDashboardRedirect("master", "/dashboard", null), null);
  assert.equal(getDashboardRedirect("master", "/dashboard/profile", null), null);
});

test("contractor cannot open client, master, or master-only dashboard UI", () => {
  assert.equal(getDashboardRedirect("contractor", "/dashboard", null), "/dashboard?role=contractor");
  assert.equal(getDashboardRedirect("contractor", "/dashboard", "client"), "/dashboard?role=contractor");
  assert.equal(getDashboardRedirect("contractor", "/dashboard/portfolio", null), "/dashboard?role=contractor");
  assert.equal(getDashboardRedirect("contractor", "/dashboard", "contractor"), null);
});

test("legacy client and unsupported admin routes always redirect safely", () => {
  assert.equal(getDashboardRedirect("client", "/client/dashboard", null), "/dashboard?role=client");
  assert.equal(getDashboardRedirect("master", "/client/dashboard", null), "/dashboard");
  assert.equal(getDashboardRedirect("admin", "/dashboard", null), "/auth/login?error=unsupported_role");
});
