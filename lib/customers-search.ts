import {
  buildUrlSearchParams,
  firstParamValue,
  type SearchParamsInput,
} from "@/lib/search-params";
import { customersSearchSchema, type CustomersSearch } from "@/lib/types/search";

export function parseCustomersSearchParams(
  params: SearchParamsInput,
): CustomersSearch {
  return customersSearchSchema.parse({
    pageIndex: firstParamValue(params.pageIndex),
    pageSize: firstParamValue(params.pageSize),
    q: firstParamValue(params.q),
    sortBy: firstParamValue(params.sortBy),
    sortDir: firstParamValue(params.sortDir),
  });
}

export function buildCustomersSearchParams(
  search: CustomersSearch,
): URLSearchParams {
  return buildUrlSearchParams([
    ["pageIndex", Math.max(0, search.pageIndex)],
    ["pageSize", search.pageSize],
    ["sortBy", search.sortBy],
    ["sortDir", search.sortDir],
    ["q", search.q],
  ]);
}

export function buildCustomersHref(
  search: CustomersSearch,
  updates?: Partial<CustomersSearch>,
): string {
  const next: CustomersSearch = {
    ...search,
    ...updates,
  };

  return `/customers?${buildCustomersSearchParams(next).toString()}`;
}
