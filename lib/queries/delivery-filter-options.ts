import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

type DeliveryFilterOptions = {
  customers: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  kinds: Array<"DELIVERY" | "RETURN">;
};

export const deliveryFilterOptionsQueryKeys = {
  all: ["deliveries", "filter-options"] as const,
};

async function fetchDeliveryFilterOptions(): Promise<DeliveryFilterOptions> {
  const response = await fetch("/api/deliveries/filter-options", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<DeliveryFilterOptions>;
  try {
    payload = (await response.json()) as ApiResponse<DeliveryFilterOptions>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const deliveryFilterOptionsQueryOptions = queryOptions({
  queryKey: deliveryFilterOptionsQueryKeys.all,
  queryFn: fetchDeliveryFilterOptions,
  staleTime: QUERY_STALE_TIMES.lookup,
});

export const deliveryFilterOptionsQuery = deliveryFilterOptionsQueryOptions;

export function useDeliveryFilterOptions() {
  return useQuery(deliveryFilterOptionsQueryOptions);
}
