import { redirect } from "next/navigation";
import { RouteHeaderConfig } from "@/components/route-header-config";
import { getTranslations } from "next-intl/server";
import { CreateDeliveryButton } from "@/components/deliveries/create-delivery-button";
import { DeliveriesMobileFilters } from "@/components/deliveries/deliveries-mobile-filters";
import { DeliveriesPageContent } from "@/components/deliveries/deliveries-page-content";
import {
  buildDeliveriesHref,
  parseDeliveriesSearchParams,
} from "@/lib/deliveries-search";
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

  const search = parseDeliveriesSearchParams(resolvedSearchParams);

  const shouldCanonicalizeRequiredParams =
    rawPageIndex !== String(search.pageIndex) ||
    rawPageSize !== String(search.pageSize) ||
    rawSortBy !== search.sortBy ||
    rawSortDir !== search.sortDir;

  if (shouldCanonicalizeRequiredParams) {
    redirect(buildDeliveriesHref(search));
  }

  return (
    <>
      <RouteHeaderConfig title={t("pageTitles.deliveries")}>
        <DeliveriesMobileFilters search={search} />
        <CreateDeliveryButton />
      </RouteHeaderConfig>
      <div className="h-[calc(100dvh-56px-2rem)] min-h-0 min-w-0 overflow-hidden md:h-[calc(100dvh-56px-3rem)]">
        <DeliveriesPageContent search={search} />
      </div>
    </>
  );
}
