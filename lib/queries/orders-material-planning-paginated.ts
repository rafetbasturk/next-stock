import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import { buildMaterialPlanningSearchParams } from "@/lib/material-planning-search";
import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { getClientTimeZone } from "@/lib/timezone-client";
import type { MaterialPlanningTableRow } from "@/lib/types/orders";
import {
  normalizeMaterialPlanningSearch,
  type MaterialPlanningSearch,
} from "@/lib/types/search";

type PaginatedMaterialPlanningResult = {
  data: Array<MaterialPlanningTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const ordersMaterialPlanningPaginatedQueryKeys = {
  all: ["orders", "material-planning", "paginated"] as const,
  list: (search: MaterialPlanningSearch, timeZone: string) =>
    [
      ...ordersMaterialPlanningPaginatedQueryKeys.all,
      normalizeMaterialPlanningSearch(search),
      { timeZone },
    ] as const,
};

async function fetchPaginatedMaterialPlanning(
  search: MaterialPlanningSearch,
): Promise<PaginatedMaterialPlanningResult> {
  const response = await fetch(
    `/api/orders/material-planning/paginated?${buildMaterialPlanningSearchParams(search)}`,
    {
      method: "GET",
      headers: {
        "x-timezone": getClientTimeZone(),
      },
      credentials: "include",
      cache: "no-store",
    },
  );

  let payload: ApiResponse<PaginatedMaterialPlanningResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedMaterialPlanningResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const ordersMaterialPlanningPaginatedQueryOptions = (
  search: MaterialPlanningSearch,
) =>
  queryOptions({
    queryKey: ordersMaterialPlanningPaginatedQueryKeys.list(
      search,
      getClientTimeZone(),
    ),
    queryFn: () => fetchPaginatedMaterialPlanning(search),
    staleTime: QUERY_STALE_TIMES.list,
    placeholderData: keepPreviousData,
  });

export const ordersMaterialPlanningPaginatedQuery =
  ordersMaterialPlanningPaginatedQueryOptions;

export function useOrdersMaterialPlanningPaginated(
  search: MaterialPlanningSearch,
) {
  return useQuery(ordersMaterialPlanningPaginatedQueryOptions(search));
}
