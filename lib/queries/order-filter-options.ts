import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

type OrderFilterOptions = {
  statuses: Array<string>;
  customers: Array<{
    id: number;
    code: string;
    name: string;
  }>;
};

export const orderFilterOptionsQueryKeys = {
  all: ["orders", "filter-options"] as const,
};

async function fetchOrderFilterOptions(): Promise<OrderFilterOptions> {
  const response = await fetch("/api/orders/filter-options", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<OrderFilterOptions>;
  try {
    payload = (await response.json()) as ApiResponse<OrderFilterOptions>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const orderFilterOptionsQueryOptions = queryOptions({
  queryKey: orderFilterOptionsQueryKeys.all,
  queryFn: fetchOrderFilterOptions,
  staleTime: QUERY_STALE_TIMES.lookup,
});

export const orderFilterOptionsQuery = orderFilterOptionsQueryOptions;

export function useOrderFilterOptions() {
  return useQuery(orderFilterOptionsQueryOptions);
}
