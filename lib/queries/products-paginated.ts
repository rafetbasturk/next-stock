import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { buildProductsSearchParams } from "@/lib/products-search";
import type { ProductTableRow } from "@/lib/types/products";
import {
  normalizeProductsSearch,
  type ProductsSearch,
} from "@/lib/types/search";

type PaginatedProductsResult = {
  data: Array<ProductTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const productsPaginatedQueryKeys = {
  all: ["products", "paginated"] as const,
  list: (search: ProductsSearch) =>
    [...productsPaginatedQueryKeys.all, normalizeProductsSearch(search)] as const,
};

async function fetchPaginatedProducts(
  search: ProductsSearch,
): Promise<PaginatedProductsResult> {
  const response = await fetch(
    `/api/products/paginated?${buildProductsSearchParams(search)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  let payload: ApiResponse<PaginatedProductsResult>;
  try {
    payload = (await response.json()) as ApiResponse<PaginatedProductsResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const productsPaginatedQueryOptions = (search: ProductsSearch) =>
  queryOptions({
    queryKey: productsPaginatedQueryKeys.list(search),
    queryFn: () => fetchPaginatedProducts(search),
    staleTime: QUERY_STALE_TIMES.list,
    placeholderData: keepPreviousData,
  });

export const productsPaginatedQuery = productsPaginatedQueryOptions;

export function useProductsPaginated(search: ProductsSearch) {
  return useQuery(productsPaginatedQueryOptions(search));
}
