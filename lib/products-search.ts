import {
  buildUrlSearchParams,
  firstParamValue,
  type SearchParamsInput,
} from "@/lib/search-params";
import { productsSearchSchema, type ProductsSearch } from "@/lib/types/search";

export function parseProductsSearchParams(params: SearchParamsInput): ProductsSearch {
  return productsSearchSchema.parse({
    pageIndex: firstParamValue(params.pageIndex),
    pageSize: firstParamValue(params.pageSize),
    q: firstParamValue(params.q),
    sortBy: firstParamValue(params.sortBy),
    sortDir: firstParamValue(params.sortDir),
    material: firstParamValue(params.material),
    customerId: firstParamValue(params.customerId),
  });
}

export function buildProductsSearchParams(search: ProductsSearch): URLSearchParams {
  return buildUrlSearchParams([
    ["pageIndex", Math.max(0, search.pageIndex)],
    ["pageSize", search.pageSize],
    ["sortBy", search.sortBy],
    ["sortDir", search.sortDir],
    ["q", search.q],
    ["material", search.material],
    ["customerId", search.customerId],
  ]);
}

export function buildProductsHref(
  search: ProductsSearch,
  updates?: Partial<ProductsSearch>,
): string {
  const next: ProductsSearch = {
    ...search,
    ...updates,
  };

  return `/products?${buildProductsSearchParams(next).toString()}`;
}
