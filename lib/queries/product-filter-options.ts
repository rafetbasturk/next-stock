import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

type ProductFilterOptions = {
  materials: Array<string>;
  customers: Array<{
    id: number;
    code: string;
    name: string;
  }>;
};

export const productFilterOptionsQueryKeys = {
  all: ["products", "filter-options"] as const,
};

async function fetchProductFilterOptions(): Promise<ProductFilterOptions> {
  const response = await fetch("/api/products/filter-options", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<ProductFilterOptions>;
  try {
    payload = (await response.json()) as ApiResponse<ProductFilterOptions>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const productFilterOptionsQueryOptions = queryOptions({
  queryKey: productFilterOptionsQueryKeys.all,
  queryFn: fetchProductFilterOptions,
  staleTime: QUERY_STALE_TIMES.lookup,
});

export const productFilterOptionsQuery = productFilterOptionsQueryOptions;

export function useProductFilterOptions() {
  return useQuery(productFilterOptionsQueryOptions);
}
