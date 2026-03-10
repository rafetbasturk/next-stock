import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

type OrderTrackingFilterOptions = {
  statuses: Array<string>;
  customers: Array<{
    id: number;
    code: string;
    name: string;
  }>;
};

export const orderTrackingFilterOptionsQueryKeys = {
  all: ["orders", "tracking", "filter-options"] as const,
};

async function fetchOrderTrackingFilterOptions(): Promise<OrderTrackingFilterOptions> {
  const response = await fetch("/api/orders/tracking/filter-options", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<OrderTrackingFilterOptions>;
  try {
    payload = (await response.json()) as ApiResponse<OrderTrackingFilterOptions>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const orderTrackingFilterOptionsQueryOptions = queryOptions({
  queryKey: orderTrackingFilterOptionsQueryKeys.all,
  queryFn: fetchOrderTrackingFilterOptions,
  staleTime: QUERY_STALE_TIMES.lookup,
});

export const orderTrackingFilterOptionsQuery = orderTrackingFilterOptionsQueryOptions;

export function useOrderTrackingFilterOptions() {
  return useQuery(orderTrackingFilterOptionsQueryOptions);
}
