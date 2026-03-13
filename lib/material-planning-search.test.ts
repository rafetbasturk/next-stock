import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMaterialPlanningHref,
  buildMaterialPlanningSearchParams,
  parseMaterialPlanningSearchParams,
} from "@/lib/material-planning-search";

test("parseMaterialPlanningSearchParams applies defaults", () => {
  const parsed = parseMaterialPlanningSearchParams({});

  assert.deepEqual(parsed, {
    pageIndex: 0,
    pageSize: 20,
    q: undefined,
    sortBy: "purchase_quantity",
    sortDir: "desc",
    status: "KAYIT|KISMEN HAZIR",
    customerId: undefined,
    startDate: undefined,
    endDate: undefined,
  });
});

test("buildMaterialPlanningSearchParams serializes route params only", () => {
  const params = buildMaterialPlanningSearchParams({
    pageIndex: 2,
    pageSize: 50,
    q: "4140",
    sortBy: "material",
    sortDir: "asc",
    status: "ÜRETİM|HAZIR",
    customerId: "1|2",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  });

  assert.equal(
    params.toString(),
    "pageIndex=2&pageSize=50&sortBy=material&sortDir=asc",
  );
});

test("buildMaterialPlanningHref preserves updates", () => {
  const href = buildMaterialPlanningHref(
    {
      pageIndex: 0,
      pageSize: 20,
      q: undefined,
      sortBy: "purchase_quantity",
      sortDir: "desc",
      status: "KAYIT|KISMEN HAZIR",
      customerId: undefined,
      startDate: undefined,
      endDate: undefined,
    },
    { q: "P-001", pageIndex: 1, status: "HAZIR" },
  );

  assert.equal(
    href,
    "/material-planning?pageIndex=1&pageSize=20&sortBy=purchase_quantity&sortDir=desc",
  );
});
