import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { buildMovementsSearchParams } from "@/lib/movements-search";
import type { StockMovementTableRow } from "@/lib/server/stock";
import { stockSearchSchema, type StockSearch } from "@/lib/types/search";

export type PaginatedStockMovementsResult = {
  data: Array<StockMovementTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const movementsPaginatedQueryKeys = {
  all: ["movements", "paginated"] as const,
  list: (search: StockSearch) =>
    [...movementsPaginatedQueryKeys.all, stockSearchSchema.parse(search)] as const,
};

async function fetchPaginatedMovements(
  search: StockSearch,
): Promise<PaginatedStockMovementsResult> {
  const response = await fetch(
    `/api/movements/paginated?${buildMovementsSearchParams(search)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  let payload: ApiResponse<PaginatedStockMovementsResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedStockMovementsResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const movementsPaginatedQueryOptions = (search: StockSearch) =>
  queryOptions({
    queryKey: movementsPaginatedQueryKeys.list(search),
    queryFn: () => fetchPaginatedMovements(search),
    staleTime: QUERY_STALE_TIMES.list,
    placeholderData: keepPreviousData,
  });

export const movementsPaginatedQuery = movementsPaginatedQueryOptions;

export function useMovementsPaginated(search: StockSearch) {
  return useQuery(movementsPaginatedQueryOptions(search));
}
