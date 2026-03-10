import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CreateCustomerButton } from "@/components/customers/create-customer-button";
import { CustomersPageContent } from "@/components/customers/customers-page-content";
import { RouteHeaderConfig } from "@/components/route-header-config";
import {
  buildCustomersHref,
  parseCustomersSearchParams,
} from "@/lib/customers-search";
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

  const search = parseCustomersSearchParams(resolvedSearchParams);

  const shouldCanonicalizeRequiredParams =
    rawPageIndex !== String(search.pageIndex) ||
    rawPageSize !== String(search.pageSize) ||
    rawSortBy !== search.sortBy ||
    rawSortDir !== search.sortDir;

  if (shouldCanonicalizeRequiredParams) {
    redirect(buildCustomersHref(search));
  }

  return (
    <>
      <RouteHeaderConfig title={t("pageTitles.customers")}>
        <CreateCustomerButton />
      </RouteHeaderConfig>
      <div className="h-[calc(100dvh-56px-2rem)] min-h-0 min-w-0 overflow-hidden md:h-[calc(100dvh-56px-3rem)]">
        <CustomersPageContent search={search} />
      </div>
    </>
  );
}
