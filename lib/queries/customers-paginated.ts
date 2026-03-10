import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { buildCustomersSearchParams } from "@/lib/customers-search";
import type { CustomerTableRow } from "@/lib/types/customers";
import {
  normalizeCustomersSearch,
  type CustomersSearch,
} from "@/lib/types/search";

type PaginatedCustomersResult = {
  data: Array<CustomerTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const customersPaginatedQueryKeys = {
  all: ["customers", "paginated"] as const,
  list: (search: CustomersSearch) =>
    [...customersPaginatedQueryKeys.all, normalizeCustomersSearch(search)] as const,
};

async function fetchPaginatedCustomers(
  search: CustomersSearch,
): Promise<PaginatedCustomersResult> {
  const response = await fetch(
    `/api/customers/paginated?${buildCustomersSearchParams(search)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  let payload: ApiResponse<PaginatedCustomersResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedCustomersResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const customersPaginatedQueryOptions = (search: CustomersSearch) =>
  queryOptions({
    queryKey: customersPaginatedQueryKeys.list(search),
    queryFn: () => fetchPaginatedCustomers(search),
    staleTime: QUERY_STALE_TIMES.list,
    placeholderData: keepPreviousData,
  });

export const customersPaginatedQuery = customersPaginatedQueryOptions;

export function useCustomersPaginated(search: CustomersSearch) {
  return useQuery(customersPaginatedQueryOptions(search));
}
