import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MaterialPlanningExportButton } from "@/components/orders/material-planning-export-button";
import { OrdersMaterialPlanningPageContent } from "@/components/orders/orders-material-planning-page-content";
import { RouteHeaderConfig } from "@/components/route-header-config";
import {
  buildMaterialPlanningHref,
  parseMaterialPlanningSearchParams,
} from "@/lib/material-planning-search";
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

  const search = parseMaterialPlanningSearchParams(resolvedSearchParams);

  const shouldCanonicalizeRequiredParams =
    rawPageIndex !== String(search.pageIndex) ||
    rawPageSize !== String(search.pageSize) ||
    rawSortBy !== search.sortBy ||
    rawSortDir !== search.sortDir;

  if (shouldCanonicalizeRequiredParams) {
    redirect(buildMaterialPlanningHref(search));
  }

  return (
    <>
      <RouteHeaderConfig title={t("pageTitles.materialPlanning")}>
        <MaterialPlanningExportButton search={search} />
      </RouteHeaderConfig>
      <div className="h-[calc(100dvh-56px-2rem)] min-h-0 min-w-0 overflow-hidden md:h-[calc(100dvh-56px-3rem)]">
        <OrdersMaterialPlanningPageContent search={search} />
      </div>
    </>
  );
}
