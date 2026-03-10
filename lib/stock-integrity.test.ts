import assert from "node:assert/strict";
import test from "node:test";

import { buildStockIntegrityReport } from "@/lib/stock-integrity";

test("buildStockIntegrityReport returns only mismatched rows with diff", () => {
  const report = buildStockIntegrityReport([
    {
      id: 1,
      code: "P-001",
      name: "Matched",
      shelf: 10,
      ledger: 10,
    },
    {
      id: 2,
      code: "P-002",
      name: "Short",
      shelf: 5,
      ledger: 8,
    },
    {
      id: 3,
      code: "P-003",
      name: "Over",
      shelf: 12,
      ledger: 7,
    },
  ]);

  assert.deepEqual(report, [
    {
      id: 2,
      code: "P-002",
      name: "Short",
      shelf: 5,
      ledger: 8,
      diff: 3,
    },
    {
      id: 3,
      code: "P-003",
      name: "Over",
      shelf: 12,
      ledger: 7,
      diff: -5,
    },
  ]);
});
