import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import type { DeliveryDetail as SharedDeliveryDetail } from "@/lib/types/deliveries";

export type DeliveryDetail = SharedDeliveryDetail;

export const deliveryDetailQueryKeys = {
  all: ["deliveries", "detail"] as const,
  detail: (deliveryId: number) =>
    [...deliveryDetailQueryKeys.all, deliveryId] as const,
};

async function fetchDeliveryDetail(
  deliveryId: number,
): Promise<DeliveryDetail | null> {
  const response = await fetch(`/api/deliveries/${deliveryId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<DeliveryDetail | null>;
  try {
    payload = (await response.json()) as ApiResponse<DeliveryDetail | null>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const deliveryDetailQueryOptions = (deliveryId: number) =>
  queryOptions({
    queryKey: deliveryDetailQueryKeys.detail(deliveryId),
    queryFn: () => fetchDeliveryDetail(deliveryId),
    staleTime: QUERY_STALE_TIMES.detail,
  });

export const deliveryDetailQuery = deliveryDetailQueryOptions;

export function useDeliveryDetail(deliveryId: number, enabled: boolean = true) {
  return useQuery({
    ...deliveryDetailQueryOptions(deliveryId),
    enabled: enabled && deliveryId > 0,
  });
}
