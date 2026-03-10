import {
  buildUrlSearchParams,
  firstParamValue,
  type SearchParamsInput,
} from "@/lib/search-params";
import {
  orderTrackingSearchSchema,
  type OrderTrackingSearch,
} from "@/lib/types/search";

export function parseOrderTrackingSearchParams(
  params: SearchParamsInput,
): OrderTrackingSearch {
  return orderTrackingSearchSchema.parse({
    pageIndex: firstParamValue(params.pageIndex),
    pageSize: firstParamValue(params.pageSize),
    q: firstParamValue(params.q),
    sortBy: firstParamValue(params.sortBy),
    sortDir: firstParamValue(params.sortDir),
    status: firstParamValue(params.status),
    customerId: firstParamValue(params.customerId),
    startDate: firstParamValue(params.startDate),
    endDate: firstParamValue(params.endDate),
    shortageOnly: firstParamValue(params.shortageOnly),
  });
}

export function buildOrderTrackingSearchParams(
  search: OrderTrackingSearch,
): URLSearchParams {
  return buildUrlSearchParams([
    ["pageIndex", Math.max(0, search.pageIndex)],
    ["pageSize", search.pageSize],
    ["sortBy", search.sortBy],
    ["sortDir", search.sortDir],
    ["q", search.q],
    ["status", search.status],
    ["customerId", search.customerId],
    ["startDate", search.startDate],
    ["endDate", search.endDate],
    ["shortageOnly", search.shortageOnly ? "true" : undefined],
  ]);
}

export function buildOrderTrackingHref(
  search: OrderTrackingSearch,
  updates?: Partial<OrderTrackingSearch>,
): string {
  const next: OrderTrackingSearch = {
    ...search,
    ...updates,
  };

  return `/orders/tracking?${buildOrderTrackingSearchParams(next).toString()}`;
}
