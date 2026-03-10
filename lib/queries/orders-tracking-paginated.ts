import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { buildOrderTrackingSearchParams } from "@/lib/orders-tracking-search";
import { getClientTimeZone } from "@/lib/timezone-client";
import type { OrderTrackingTableRow } from "@/lib/types/orders";
import {
  normalizeOrderTrackingSearch,
  type OrderTrackingSearch,
} from "@/lib/types/search";

type PaginatedOrderTrackingResult = {
  data: Array<OrderTrackingTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const ordersTrackingPaginatedQueryKeys = {
  all: ["orders", "tracking", "paginated"] as const,
  list: (search: OrderTrackingSearch, timeZone: string) =>
    [
      ...ordersTrackingPaginatedQueryKeys.all,
      normalizeOrderTrackingSearch(search),
      { timeZone },
    ] as const,
};

async function fetchPaginatedOrderTracking(
  search: OrderTrackingSearch,
): Promise<PaginatedOrderTrackingResult> {
  const response = await fetch(
    `/api/orders/tracking/paginated?${buildOrderTrackingSearchParams(search)}`,
    {
      method: "GET",
      headers: {
        "x-timezone": getClientTimeZone(),
      },
      credentials: "include",
      cache: "no-store",
    },
  );

  let payload: ApiResponse<PaginatedOrderTrackingResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedOrderTrackingResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const ordersTrackingPaginatedQueryOptions = (search: OrderTrackingSearch) =>
  queryOptions({
    queryKey: ordersTrackingPaginatedQueryKeys.list(
      search,
      getClientTimeZone(),
    ),
    queryFn: () => fetchPaginatedOrderTracking(search),
    staleTime: QUERY_STALE_TIMES.list,
    placeholderData: keepPreviousData,
  });

export const ordersTrackingPaginatedQuery = ordersTrackingPaginatedQueryOptions;

export function useOrdersTrackingPaginated(search: OrderTrackingSearch) {
  return useQuery(ordersTrackingPaginatedQueryOptions(search));
}
