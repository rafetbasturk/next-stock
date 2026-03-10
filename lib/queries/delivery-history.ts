import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

export type DeliveryHistoryMovement = {
  id: number;
  deliveredQuantity: number;
  deliveryNumber: string;
  deliveryDate: string;
  kind: "DELIVERY" | "RETURN";
};

export type DeliveryHistoryItem = {
  id: number;
  itemType: "standard" | "custom";
  orderNumber: string;
  productCode: string;
  productName: string | null;
  orderedQuantity: number;
  currentDeliveredQuantity: number;
  movements: Array<DeliveryHistoryMovement>;
};

type DeliveryHistoryResult = {
  deliveryNumber: string;
  kind: "DELIVERY" | "RETURN";
  items: Array<DeliveryHistoryItem>;
};

export const deliveryHistoryQueryKeys = {
  all: ["deliveries", "history"] as const,
  detail: (deliveryId: number) =>
    [...deliveryHistoryQueryKeys.all, deliveryId] as const,
};

async function fetchDeliveryHistory(
  deliveryId: number,
): Promise<DeliveryHistoryResult> {
  const response = await fetch(`/api/deliveries/${deliveryId}/history`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<DeliveryHistoryResult>;
  try {
    payload = (await response.json()) as ApiResponse<DeliveryHistoryResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const deliveryHistoryQueryOptions = (deliveryId: number) =>
  queryOptions({
    queryKey: deliveryHistoryQueryKeys.detail(deliveryId),
    queryFn: () => fetchDeliveryHistory(deliveryId),
    staleTime: QUERY_STALE_TIMES.detail,
  });

export const deliveryHistoryQuery = deliveryHistoryQueryOptions;

export function useDeliveryHistory(deliveryId: number, enabled: boolean = true) {
  return useQuery({
    ...deliveryHistoryQueryOptions(deliveryId),
    enabled: enabled && deliveryId > 0,
  });
}
