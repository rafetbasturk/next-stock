import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import type { Currency } from "@/lib/types/domain";

export type OrderHistoryItemDelivery = {
  id: number;
  deliveredQuantity: number;
  deliveryNumber: string;
  deliveryDate: string;
  kind: "DELIVERY" | "RETURN";
};

export type OrderHistoryItem = {
  id: number;
  itemType: "standard" | "custom";
  productId: number | null;
  productCode: string;
  productName: string | null;
  unitPrice: number;
  currency: Currency;
  stockQuantity: number | null;
  quantity: number;
  materialPlannedAt: string | null;
  materialPlannedBy: string | null;
  canUndoMaterialPlanning: boolean;
  deliveries: Array<OrderHistoryItemDelivery>;
};

type OrderHistoryResult = {
  items: Array<OrderHistoryItem>;
};

export const orderHistoryQueryKeys = {
  all: ["orders", "history"] as const,
  detail: (orderId: number) => [...orderHistoryQueryKeys.all, orderId] as const,
};

async function fetchOrderHistory(orderId: number): Promise<OrderHistoryResult> {
  const response = await fetch(`/api/orders/${orderId}/history`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<OrderHistoryResult>;
  try {
    payload = (await response.json()) as ApiResponse<OrderHistoryResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const orderHistoryQueryOptions = (orderId: number) =>
  queryOptions({
    queryKey: orderHistoryQueryKeys.detail(orderId),
    queryFn: () => fetchOrderHistory(orderId),
    staleTime: QUERY_STALE_TIMES.detail,
  });

export const orderHistoryQuery = orderHistoryQueryOptions;

export function useOrderHistory(orderId: number, enabled: boolean = true) {
  return useQuery({
    ...orderHistoryQueryOptions(orderId),
    enabled: enabled && orderId > 0,
  });
}
