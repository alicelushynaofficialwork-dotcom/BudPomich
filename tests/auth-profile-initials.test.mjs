import assert from "node:assert/strict";
import test from "node:test";

import { getProfileInitials } from "../lib/profile.ts";

test("initials use the first letter of the first two name parts", () => {
  assert.equal(getProfileInitials("Alice Test"), "AT");
  assert.equal(getProfileInitials("  Аліса   Тест  "), "АТ");
});

test("a single name uses its first two letters", () => {
  assert.equal(getProfileInitials("Alice"), "AL");
  assert.equal(getProfileInitials("Я"), "Я");
});

test("an empty name has a safe client fallback", () => {
  assert.equal(getProfileInitials(""), "КЛ");
  assert.equal(getProfileInitials(null), "КЛ");
});
