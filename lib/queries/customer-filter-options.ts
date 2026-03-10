import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

type CustomerFilterOption = {
  id: number;
  name: string;
  code: string;
};

type CustomerFilterQueryFilters = {
  distinct?: boolean;
};

export const customerFilterQueryKeys = {
  all: ["customers", "filter-options"] as const,
  list: (filters?: CustomerFilterQueryFilters) =>
    [...customerFilterQueryKeys.all, { distinct: filters?.distinct ?? false }] as const,
};

async function fetchCustomerFilterOptions(
  filters?: CustomerFilterQueryFilters,
): Promise<Array<CustomerFilterOption>> {
  const search = new URLSearchParams();
  if (filters?.distinct) {
    search.set("distinct", "true");
  }

  const response = await fetch(
    `/api/customers/filter-options${search.toString() ? `?${search.toString()}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  let payload: ApiResponse<Array<CustomerFilterOption>>;
  try {
    payload = (await response.json()) as ApiResponse<Array<CustomerFilterOption>>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const customerFilterOptionsQueryOptions = (filters?: CustomerFilterQueryFilters) =>
  queryOptions({
    queryKey: customerFilterQueryKeys.list(filters),
    queryFn: () => fetchCustomerFilterOptions(filters),
    staleTime: QUERY_STALE_TIMES.lookup,
  });

export const customerFilterOptionsQuery = customerFilterOptionsQueryOptions;

export function useCustomerFilterOptions(filters?: CustomerFilterQueryFilters) {
  return useQuery(customerFilterOptionsQueryOptions(filters));
}
