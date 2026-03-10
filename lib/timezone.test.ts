import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidIanaTimeZone,
  localDateToUtcDayBounds,
  resolveRequestTimeZone,
  utcInstantToLocalYearMonth,
} from "@/lib/timezone";

test("isValidIanaTimeZone validates IANA names", () => {
  assert.equal(isValidIanaTimeZone("Europe/Istanbul"), true);
  assert.equal(isValidIanaTimeZone("America/New_York"), true);
  assert.equal(isValidIanaTimeZone("not/a-timezone"), false);
});

test("resolveRequestTimeZone applies profile -> cookie -> header -> UTC precedence", () => {
  assert.equal(
    resolveRequestTimeZone({
      userTimeZone: "Europe/Istanbul",
      cookieTimeZone: "UTC",
      headerTimeZone: "America/New_York",
    }),
    "Europe/Istanbul",
  );

  assert.equal(
    resolveRequestTimeZone({
      userTimeZone: "invalid/timezone",
      cookieTimeZone: "America/New_York",
      headerTimeZone: "UTC",
    }),
    "America/New_York",
  );

  assert.equal(
    resolveRequestTimeZone({
      userTimeZone: "invalid/timezone",
      cookieTimeZone: "also/invalid",
      headerTimeZone: "still/invalid",
    }),
    "UTC",
  );
});

test("localDateToUtcDayBounds maps Istanbul local day to UTC boundaries", () => {
  const bounds = localDateToUtcDayBounds("2026-03-01", "Europe/Istanbul");

  assert.equal(bounds.startIso, "2026-02-28T21:00:00.000Z");
  assert.equal(bounds.endExclusiveIso, "2026-03-01T21:00:00.000Z");
});

test("localDateToUtcDayBounds handles DST transition day in New York", () => {
  const bounds = localDateToUtcDayBounds("2026-03-08", "America/New_York");

  assert.equal(bounds.startIso, "2026-03-08T05:00:00.000Z");
  assert.equal(bounds.endExclusiveIso, "2026-03-09T04:00:00.000Z");
});

test("utcInstantToLocalYearMonth returns month in the target timezone", () => {
  assert.equal(
    utcInstantToLocalYearMonth("2026-03-31T22:30:00.000Z", "Europe/Istanbul"),
    "2026-04",
  );
  assert.equal(
    utcInstantToLocalYearMonth("2026-03-31T22:30:00.000Z", "America/New_York"),
    "2026-03",
  );
});

test("localDateToUtcDayBounds rejects invalid local date format", () => {
  assert.throws(() => localDateToUtcDayBounds("03-01-2026", "UTC"));
  assert.throws(() => localDateToUtcDayBounds("2026-02-30", "UTC"));
});
