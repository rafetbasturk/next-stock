import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { buildDeliveriesSearchParams } from "@/lib/deliveries-search";
import type { DeliveryTableRow } from "@/lib/types/deliveries";
import {
  normalizeDeliveriesSearch,
  type DeliveriesSearch,
} from "@/lib/types/search";

type PaginatedDeliveriesResult = {
  data: Array<DeliveryTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const deliveriesPaginatedQueryKeys = {
  all: ["deliveries", "paginated"] as const,
  list: (search: DeliveriesSearch) =>
    [
      ...deliveriesPaginatedQueryKeys.all,
      normalizeDeliveriesSearch(search),
    ] as const,
};

async function fetchPaginatedDeliveries(
  search: DeliveriesSearch,
): Promise<PaginatedDeliveriesResult> {
  const response = await fetch(
    `/api/deliveries/paginated?${buildDeliveriesSearchParams(search)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  let payload: ApiResponse<PaginatedDeliveriesResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedDeliveriesResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const deliveriesPaginatedQueryOptions = (search: DeliveriesSearch) =>
  queryOptions({
    queryKey: deliveriesPaginatedQueryKeys.list(search),
    queryFn: () => fetchPaginatedDeliveries(search),
    staleTime: QUERY_STALE_TIMES.list,
    placeholderData: keepPreviousData,
  });

export const deliveriesPaginatedQuery = deliveriesPaginatedQueryOptions;

export function useDeliveriesPaginated(search: DeliveriesSearch) {
  return useQuery(deliveriesPaginatedQueryOptions(search));
}
