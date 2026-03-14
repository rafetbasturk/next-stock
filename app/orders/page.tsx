import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CreateOrderButton } from "@/components/orders/create-order-button";
import { OrdersMobileFilters } from "@/components/orders/orders-mobile-filters";
import { OrdersPageContent } from "@/components/orders/orders-page-content";
import { RouteHeaderConfig } from "@/components/route-header-config";
import {
  buildOrdersHref,
  parseOrdersSearchParams,
} from "@/lib/orders-search";
import { firstParamValue } from "@/lib/search-params";

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

  const search = parseOrdersSearchParams(resolvedSearchParams);

  const shouldCanonicalizeRequiredParams =
    rawPageIndex !== String(search.pageIndex) ||
    rawPageSize !== String(search.pageSize) ||
    rawSortBy !== search.sortBy ||
    rawSortDir !== search.sortDir;

  if (shouldCanonicalizeRequiredParams) {
    redirect(buildOrdersHref(search));
  }

  return (
    <>
      <RouteHeaderConfig title={t("pageTitles.orders")}>
        <OrdersMobileFilters search={search} />
        <CreateOrderButton />
      </RouteHeaderConfig>
      <div className="h-[calc(100dvh-56px-2rem)] min-h-0 min-w-0 overflow-hidden md:h-[calc(100dvh-56px-3rem)]">
        <OrdersPageContent search={search} />
      </div>
    </>
  );
}
