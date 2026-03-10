import {
  buildUrlSearchParams,
  firstParamValue,
  type SearchParamsInput,
} from "@/lib/search-params";
import { ordersSearchSchema, type OrdersSearch } from "@/lib/types/search";

export function parseOrdersSearchParams(params: SearchParamsInput): OrdersSearch {
  return ordersSearchSchema.parse({
    pageIndex: firstParamValue(params.pageIndex),
    pageSize: firstParamValue(params.pageSize),
    q: firstParamValue(params.q),
    sortBy: firstParamValue(params.sortBy),
    sortDir: firstParamValue(params.sortDir),
    status: firstParamValue(params.status),
    customerId: firstParamValue(params.customerId),
    startDate: firstParamValue(params.startDate),
    endDate: firstParamValue(params.endDate),
  });
}

export function buildOrdersSearchParams(search: OrdersSearch): URLSearchParams {
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
  ]);
}

export function buildOrdersHref(
  search: OrdersSearch,
  updates?: Partial<OrdersSearch>,
): string {
  const next: OrdersSearch = {
    ...search,
    ...updates,
  };

  return `/orders?${buildOrdersSearchParams(next).toString()}`;
}
