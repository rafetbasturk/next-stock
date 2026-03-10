import {
  buildUrlSearchParams,
  firstParamValue,
  type SearchParamsInput,
} from "@/lib/search-params";
import { stockSearchSchema, type StockSearch } from "@/lib/types/search";

export function parseMovementsSearchParams(params: SearchParamsInput): StockSearch {
  return stockSearchSchema.parse({
    pageIndex: firstParamValue(params.pageIndex),
    pageSize: firstParamValue(params.pageSize),
    q: firstParamValue(params.q),
    movementType: firstParamValue(params.movementType),
    productId: firstParamValue(params.productId),
  });
}

export function buildMovementsSearchParams(search: StockSearch): URLSearchParams {
  return buildUrlSearchParams([
    ["pageIndex", Math.max(0, search.pageIndex)],
    ["pageSize", search.pageSize],
    ["q", search.q],
    ["movementType", search.movementType],
    [
      "productId",
      typeof search.productId === "number" && search.productId > 0
        ? search.productId
        : undefined,
    ],
  ]);
}

export function buildMovementsHref(
  search: StockSearch,
  updates?: Partial<StockSearch>,
): string {
  const next: StockSearch = {
    ...search,
    ...updates,
  };

  return `/movements?${buildMovementsSearchParams(next).toString()}`;
}
