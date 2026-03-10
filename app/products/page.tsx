import { RouteHeaderConfig } from "@/components/route-header-config";
import { CreateProductButton } from "@/components/products/create-product-button";
import { ProductsPageContent } from "@/components/products/products-page-content";
import { ProductsMobileFilters } from "@/components/products/products-mobile-filters";
import {
  buildProductsHref,
  parseProductsSearchParams,
} from "@/lib/products-search";
import { firstParamValue } from "@/lib/search-params";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("App");
  const resolvedSearchParams = await searchParams;
  const rawPageIndex = firstParamValue(resolvedSearchParams.pageIndex);
  const rawPageSize = firstParamValue(resolvedSearchParams.pageSize);
  const rawSortBy = firstParamValue(resolvedSearchParams.sortBy);
  const rawSortDir = firstParamValue(resolvedSearchParams.sortDir);

  const search = parseProductsSearchParams(resolvedSearchParams);

  const shouldCanonicalizeRequiredParams =
    rawPageIndex !== String(search.pageIndex) ||
    rawPageSize !== String(search.pageSize) ||
    rawSortBy !== search.sortBy ||
    rawSortDir !== search.sortDir;

  if (shouldCanonicalizeRequiredParams) {
    redirect(buildProductsHref(search));
  }

  return (
    <>
      <RouteHeaderConfig title={t("pageTitles.products")}>
        <ProductsMobileFilters search={search} />
        <CreateProductButton />
      </RouteHeaderConfig>
      <div className="h-[calc(100dvh-56px-2rem)] min-h-0 min-w-0 overflow-hidden md:h-[calc(100dvh-56px-3rem)]">
        <ProductsPageContent search={search} />
      </div>
    </>
  );
}
