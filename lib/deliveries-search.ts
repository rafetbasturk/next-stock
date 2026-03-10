import {
  buildUrlSearchParams,
  firstParamValue,
  type SearchParamsInput,
} from "@/lib/search-params";
import {
  deliveriesSearchSchema,
  type DeliveriesSearch,
} from "@/lib/types/search";

export function parseDeliveriesSearchParams(
  params: SearchParamsInput,
): DeliveriesSearch {
  return deliveriesSearchSchema.parse({
    pageIndex: firstParamValue(params.pageIndex),
    pageSize: firstParamValue(params.pageSize),
    q: firstParamValue(params.q),
    sortBy: firstParamValue(params.sortBy),
    sortDir: firstParamValue(params.sortDir),
    kind: firstParamValue(params.kind),
    customerId: firstParamValue(params.customerId),
    startDate: firstParamValue(params.startDate),
    endDate: firstParamValue(params.endDate),
  });
}

export function buildDeliveriesSearchParams(
  search: DeliveriesSearch,
): URLSearchParams {
  return buildUrlSearchParams([
    ["pageIndex", Math.max(0, search.pageIndex)],
    ["pageSize", search.pageSize],
    ["sortBy", search.sortBy],
    ["sortDir", search.sortDir],
    ["q", search.q],
    ["kind", search.kind],
    ["customerId", search.customerId],
    ["startDate", search.startDate],
    ["endDate", search.endDate],
  ]);
}

export function buildDeliveriesHref(
  search: DeliveriesSearch,
  updates?: Partial<DeliveriesSearch>,
): string {
  const next: DeliveriesSearch = {
    ...search,
    ...updates,
  };

  return `/deliveries?${buildDeliveriesSearchParams(next).toString()}`;
}
