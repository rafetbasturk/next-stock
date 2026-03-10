import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

export type OrderProductOption = {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  currency: string;
};

export const orderProductOptionsQueryKeys = {
  all: ["orders", "product-options"] as const,
};

async function fetchOrderProductOptions(): Promise<Array<OrderProductOption>> {
  const response = await fetch("/api/orders/product-options", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<Array<OrderProductOption>>;
  try {
    payload = (await response.json()) as ApiResponse<Array<OrderProductOption>>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const orderProductOptionsQueryOptions = queryOptions({
  queryKey: orderProductOptionsQueryKeys.all,
  queryFn: fetchOrderProductOptions,
  staleTime: QUERY_STALE_TIMES.lookup,
});

export const orderProductOptionsQuery = orderProductOptionsQueryOptions;

export function useOrderProductOptions() {
  return useQuery(orderProductOptionsQueryOptions);
}
