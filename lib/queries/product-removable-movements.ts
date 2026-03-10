"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import type { StockMovementTableRow } from "@/lib/server/stock";

type PaginatedStockMovementsResult = {
  data: Array<StockMovementTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

const removableMovementTypes = new Set(["IN", "OUT", "ADJUSTMENT", "TRANSFER"]);

export const productRemovableMovementsQueryKeys = {
  all: ["movements", "removable-by-product"] as const,
  list: (productId: number) =>
    [...productRemovableMovementsQueryKeys.all, productId] as const,
};

async function fetchProductRemovableMovements(
  productId: number,
): Promise<Array<StockMovementTableRow>> {
  const params = new URLSearchParams();
  params.set("pageIndex", "0");
  params.set("pageSize", "100");
  params.set("productId", String(productId));

  const response = await fetch(`/api/movements/paginated?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<PaginatedStockMovementsResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedStockMovementsResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data.data.filter((row) => removableMovementTypes.has(row.movementType));
}

export const productRemovableMovementsQueryOptions = (productId: number) =>
  queryOptions({
    queryKey: productRemovableMovementsQueryKeys.list(productId),
    queryFn: () => fetchProductRemovableMovements(productId),
    enabled: productId > 0,
    staleTime: QUERY_STALE_TIMES.detail,
  });

export const productRemovableMovementsQuery = productRemovableMovementsQueryOptions;

export function useProductRemovableMovements(productId: number, enabled: boolean = true) {
  return useQuery({
    ...productRemovableMovementsQueryOptions(productId),
    enabled: enabled && productId > 0,
  });
}
