"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import type { OrderDetail as SharedOrderDetail } from "@/lib/types/orders";

export type OrderDetail = SharedOrderDetail;

export const orderDetailQueryKeys = {
  all: ["orders", "detail"] as const,
  detail: (orderId: number) => [...orderDetailQueryKeys.all, orderId] as const,
};

async function fetchOrderDetail(orderId: number): Promise<OrderDetail | null> {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<OrderDetail | null>;
  try {
    payload = (await response.json()) as ApiResponse<OrderDetail | null>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const orderDetailQueryOptions = (orderId: number) =>
  queryOptions({
    queryKey: orderDetailQueryKeys.detail(orderId),
    queryFn: () => fetchOrderDetail(orderId),
    staleTime: QUERY_STALE_TIMES.detail,
  });

export const orderDetailQuery = orderDetailQueryOptions;

export function useOrderDetail(orderId: number, enabled: boolean = true) {
  return useQuery({
    ...orderDetailQueryOptions(orderId),
    enabled: enabled && orderId > 0,
  });
}
