import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { buildOrdersSearchParams } from "@/lib/orders-search";
import { getClientTimeZone } from "@/lib/timezone-client";
import type { OrderTableRow } from "@/lib/types/orders";
import {
  normalizeOrdersSearch,
  type OrdersSearch,
} from "@/lib/types/search";

type PaginatedOrdersResult = {
  data: Array<OrderTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const ordersPaginatedQueryKeys = {
  all: ["orders", "paginated"] as const,
  list: (search: OrdersSearch, timeZone: string) =>
    [
      ...ordersPaginatedQueryKeys.all,
      normalizeOrdersSearch(search),
      { timeZone },
    ] as const,
};

async function fetchPaginatedOrders(
  search: OrdersSearch,
): Promise<PaginatedOrdersResult> {
  const response = await fetch(`/api/orders/paginated?${buildOrdersSearchParams(search)}`, {
    method: "GET",
    headers: {
      "x-timezone": getClientTimeZone(),
    },
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<PaginatedOrdersResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedOrdersResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const ordersPaginatedQueryOptions = (search: OrdersSearch) =>
  queryOptions({
    queryKey: ordersPaginatedQueryKeys.list(search, getClientTimeZone()),
    queryFn: () => fetchPaginatedOrders(search),
    staleTime: QUERY_STALE_TIMES.list,
    placeholderData: keepPreviousData,
  });

export const ordersPaginatedQuery = ordersPaginatedQueryOptions;

export function useOrdersPaginated(search: OrdersSearch) {
  return useQuery(ordersPaginatedQueryOptions(search));
}
