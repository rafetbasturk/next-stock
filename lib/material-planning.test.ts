import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMaterialPlanningRows,
  createMaterialPlanningComparator,
} from "@/lib/material-planning";

test("buildMaterialPlanningRows aggregates remaining demand per product", () => {
  const rows = buildMaterialPlanningRows([
    {
      productId: 1,
      productCode: "P-001",
      productName: "Bracket",
      stockQuantity: 3,
      remainingQuantity: 4,
      material: "4140",
      specs: "40x20",
    },
    {
      productId: 1,
      productCode: "P-001",
      productName: "Bracket",
      stockQuantity: 3,
      remainingQuantity: 5,
      material: "4140",
      specs: "40x20",
    },
  ]);

  assert.deepEqual(rows, [
    {
      productId: 1,
      productCode: "P-001",
      productName: "Bracket",
      stockQuantity: 3,
      openOrderQuantity: 9,
      purchaseQuantity: 6,
      material: "4140",
      specs: "40x20",
    },
  ]);
});

test("buildMaterialPlanningRows excludes products fully covered by stock", () => {
  const rows = buildMaterialPlanningRows([
    {
      productId: 1,
      productCode: "P-001",
      productName: "Bracket",
      stockQuantity: 10,
      remainingQuantity: 6,
      material: "4140",
      specs: "40x20",
    },
  ]);

  assert.deepEqual(rows, []);
});

test("buildMaterialPlanningRows ignores non-positive remaining quantities", () => {
  const rows = buildMaterialPlanningRows([
    {
      productId: 1,
      productCode: "P-001",
      productName: "Bracket",
      stockQuantity: 1,
      remainingQuantity: 0,
      material: "4140",
      specs: "40x20",
    },
    {
      productId: 2,
      productCode: "P-002",
      productName: "Frame",
      stockQuantity: 1,
      remainingQuantity: -2,
      material: "304",
      specs: "10x10",
    },
  ]);

  assert.deepEqual(rows, []);
});

test("createMaterialPlanningComparator sorts by purchase quantity descending", () => {
  const rows = [
    {
      productId: 1,
      productCode: "P-001",
      productName: "Bracket",
      stockQuantity: 1,
      openOrderQuantity: 9,
      purchaseQuantity: 8,
      material: "4140",
      specs: "40x20",
    },
    {
      productId: 2,
      productCode: "P-002",
      productName: "Frame",
      stockQuantity: 2,
      openOrderQuantity: 6,
      purchaseQuantity: 4,
      material: "304",
      specs: "10x10",
    },
  ];

  rows.sort(createMaterialPlanningComparator("purchase_quantity", "desc"));

  assert.deepEqual(
    rows.map((row) => row.productCode),
    ["P-001", "P-002"],
  );
});
