"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import type { ProductDetail as SharedProductDetail } from "@/lib/types/products";

export type ProductDetail = SharedProductDetail;

export const productDetailQueryKeys = {
  all: ["products", "detail"] as const,
  detail: (productId: number) => [...productDetailQueryKeys.all, productId] as const,
};

async function fetchProductDetail(productId: number): Promise<ProductDetail | null> {
  const response = await fetch(`/api/products/${productId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<ProductDetail | null>;
  try {
    payload = (await response.json()) as ApiResponse<ProductDetail | null>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const productDetailQueryOptions = (productId: number) =>
  queryOptions({
    queryKey: productDetailQueryKeys.detail(productId),
    queryFn: () => fetchProductDetail(productId),
    staleTime: QUERY_STALE_TIMES.detail,
  });

export const productDetailQuery = productDetailQueryOptions;

export function useProductDetail(productId: number, enabled: boolean = true) {
  return useQuery({
    ...productDetailQueryOptions(productId),
    enabled: enabled && productId > 0,
  });
}
