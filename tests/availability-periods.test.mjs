import assert from "node:assert/strict";
import test from "node:test";
import { groupConsecutiveDates } from "../lib/availability.ts";

test("groups one date as a one-day period", () => {
  assert.deepEqual(groupConsecutiveDates(["2026-08-03"]), [
    { startDate: "2026-08-03", endDate: "2026-08-03" },
  ]);
});

test("keeps unrelated dates in separate periods", () => {
  assert.deepEqual(groupConsecutiveDates(["2026-07-23", "2026-07-29", "2026-08-03"]), [
    { startDate: "2026-07-23", endDate: "2026-07-23" },
    { startDate: "2026-07-29", endDate: "2026-07-29" },
    { startDate: "2026-08-03", endDate: "2026-08-03" },
  ]);
});

test("groups consecutive dates regardless of input order", () => {
  assert.deepEqual(groupConsecutiveDates(["2026-07-25", "2026-07-23", "2026-07-24"]), [
    { startDate: "2026-07-23", endDate: "2026-07-25" },
  ]);
});

test("bridging date joins two periods", () => {
  assert.deepEqual(groupConsecutiveDates(["2026-07-23", "2026-07-24", "2026-07-26", "2026-07-27", "2026-07-25"]), [
    { startDate: "2026-07-23", endDate: "2026-07-27" },
  ]);
});

test("removing a middle date splits a period", () => {
  assert.deepEqual(groupConsecutiveDates(["2026-07-23", "2026-07-24", "2026-07-26", "2026-07-27"]), [
    { startDate: "2026-07-23", endDate: "2026-07-24" },
    { startDate: "2026-07-26", endDate: "2026-07-27" },
  ]);
});

test("groups dates across month and year boundaries", () => {
  assert.deepEqual(groupConsecutiveDates(["2026-07-31", "2026-08-01", "2026-12-31", "2027-01-01"]), [
    { startDate: "2026-07-31", endDate: "2026-08-01" },
    { startDate: "2026-12-31", endDate: "2027-01-01" },
  ]);
});

test("removes duplicates and ignores invalid date keys", () => {
  assert.deepEqual(groupConsecutiveDates(["2026-07-23", "2026-07-23", "invalid", "2026-02-30"]), [
    { startDate: "2026-07-23", endDate: "2026-07-23" },
  ]);
});

test("returns an empty list for an empty selection", () => {
  assert.deepEqual(groupConsecutiveDates([]), []);
});
