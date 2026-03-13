import type { MaterialPlanningTableRow } from "@/lib/types/orders";
import type { MaterialPlanningSearch } from "@/lib/types/search";

export type MaterialPlanningSourceRow = {
  productId: number;
  productCode: string;
  productName: string;
  stockQuantity: number;
  remainingQuantity: number;
  material: string | null;
  specs: string | null;
};

export function buildMaterialPlanningRows(
  rows: Array<MaterialPlanningSourceRow>,
): Array<MaterialPlanningTableRow> {
  const aggregated = new Map<number, MaterialPlanningTableRow>();

  for (const row of rows) {
    if (row.remainingQuantity <= 0) continue;

    const current = aggregated.get(row.productId);

    if (current) {
      current.openOrderQuantity += row.remainingQuantity;
      continue;
    }

    aggregated.set(row.productId, {
      productId: row.productId,
      productCode: row.productCode,
      productName: row.productName,
      stockQuantity: row.stockQuantity,
      openOrderQuantity: row.remainingQuantity,
      purchaseQuantity: 0,
      material: row.material,
      specs: row.specs,
    });
  }

  return [...aggregated.values()]
    .map((row) => ({
      ...row,
      purchaseQuantity: Math.max(row.openOrderQuantity - row.stockQuantity, 0),
    }))
    .filter((row) => row.purchaseQuantity > 0);
}

export function buildMaterialPlanningSearchText(
  row: MaterialPlanningTableRow,
): string {
  return [
    row.productCode,
    row.productName,
    row.material ?? "",
    row.specs ?? "",
    String(row.stockQuantity),
    String(row.openOrderQuantity),
    String(row.purchaseQuantity),
  ]
    .join(" ")
    .toLocaleLowerCase("tr");
}

export function createMaterialPlanningComparator(
  sortBy: MaterialPlanningSearch["sortBy"],
  sortDir: "asc" | "desc",
) {
  const direction = sortDir === "desc" ? -1 : 1;

  return (left: MaterialPlanningTableRow, right: MaterialPlanningTableRow) => {
    let result = 0;

    switch (sortBy) {
      case "product_code":
        result = left.productCode.localeCompare(right.productCode, "tr", {
          numeric: true,
          sensitivity: "base",
        });
        break;
      case "product_name":
        result = left.productName.localeCompare(right.productName, "tr", {
          numeric: true,
          sensitivity: "base",
        });
        break;
      case "stock":
        result = left.stockQuantity - right.stockQuantity;
        break;
      case "open_order_quantity":
        result = left.openOrderQuantity - right.openOrderQuantity;
        break;
      case "material":
        result = (left.material ?? "").localeCompare(right.material ?? "", "tr", {
          numeric: true,
          sensitivity: "base",
        });
        break;
      case "specs":
        result = (left.specs ?? "").localeCompare(right.specs ?? "", "tr", {
          numeric: true,
          sensitivity: "base",
        });
        break;
      case "purchase_quantity":
      default:
        result = left.purchaseQuantity - right.purchaseQuantity;
        break;
    }

    if (result !== 0) {
      return result * direction;
    }

    return (
      left.productCode.localeCompare(right.productCode, "tr", {
        numeric: true,
        sensitivity: "base",
      }) ||
      left.productId - right.productId
    );
  };
}
