import { queryOptions, useQuery } from "@tanstack/react-query";

import type { DeliveryFormOrderOption } from "@/components/deliveries/delivery-form/types";
import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

export const deliveryOrderOptionsQueryKeys = {
  all: ["deliveries", "order-options"] as const,
};

async function fetchDeliveryOrderOptions(): Promise<Array<DeliveryFormOrderOption>> {
  const response = await fetch("/api/deliveries/order-options", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<Array<DeliveryFormOrderOption>>;
  try {
    payload = (await response.json()) as ApiResponse<Array<DeliveryFormOrderOption>>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const deliveryOrderOptionsQueryOptions = queryOptions({
  queryKey: deliveryOrderOptionsQueryKeys.all,
  queryFn: fetchDeliveryOrderOptions,
  staleTime: QUERY_STALE_TIMES.lookup,
});

export const deliveryOrderOptionsQuery = deliveryOrderOptionsQueryOptions;

export function useDeliveryOrderOptions(enabled: boolean = true) {
  return useQuery({
    ...deliveryOrderOptionsQueryOptions,
    enabled,
  });
}
