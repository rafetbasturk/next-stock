import assert from "node:assert/strict";
import test from "node:test";

import {
  createRatesVersion,
  shouldUpdateRates,
  type Rate,
} from "@/lib/currency";

test("createRatesVersion is stable regardless of rate ordering", () => {
  const first: Array<Rate> = [
    { currency: "USD", targetCurrency: "USD", rate: 1 },
    { currency: "USD", targetCurrency: "TRY", rate: 40.5 },
    { currency: "USD", targetCurrency: "EUR", rate: 0.92 },
  ];
  const second: Array<Rate> = [
    { currency: "USD", targetCurrency: "EUR", rate: 0.92 },
    { currency: "USD", targetCurrency: "USD", rate: 1 },
    { currency: "USD", targetCurrency: "TRY", rate: 40.5 },
  ];

  assert.equal(
    createRatesVersion("USD", "2026-03-08", first),
    createRatesVersion("USD", "2026-03-08", second),
  );
});

test("createRatesVersion changes when provider date or rates change", () => {
  const rates: Array<Rate> = [
    { currency: "EUR", targetCurrency: "EUR", rate: 1 },
    { currency: "EUR", targetCurrency: "USD", rate: 1.08 },
  ];

  assert.notEqual(
    createRatesVersion("EUR", "2026-03-08", rates),
    createRatesVersion("EUR", "2026-03-09", rates),
  );

  assert.notEqual(
    createRatesVersion("EUR", "2026-03-08", rates),
    createRatesVersion("EUR", "2026-03-08", [
      { currency: "EUR", targetCurrency: "EUR", rate: 1 },
      { currency: "EUR", targetCurrency: "USD", rate: 1.09 },
    ]),
  );
});

test("shouldUpdateRates uses fetched timestamps, not semantic versions", () => {
  const freshTimestamp = Date.now() - 60_000;
  const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;

  assert.equal(shouldUpdateRates(freshTimestamp), false);
  assert.equal(shouldUpdateRates(staleTimestamp), true);
});
