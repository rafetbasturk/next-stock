import { RouteHeaderConfig } from "@/components/route-header-config";
import { MovementsMobileFilters } from "@/components/movements/movements-mobile-filters";
import { MovementsPageContent } from "@/components/movements/movements-page-content";
import {
  buildMovementsHref,
  parseMovementsSearchParams,
} from "@/lib/movements-search";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { firstParamValue } from "@/lib/search-params";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("App");
  const resolvedSearchParams = await searchParams;

  const rawPageIndex = firstParamValue(resolvedSearchParams.pageIndex);
  const rawPageSize = firstParamValue(resolvedSearchParams.pageSize);
  const rawQ = firstParamValue(resolvedSearchParams.q);
  const rawMovementType = firstParamValue(resolvedSearchParams.movementType);
  const rawProductId = firstParamValue(resolvedSearchParams.productId);

  const search = parseMovementsSearchParams(resolvedSearchParams);

  const shouldCanonicalizeRequiredParams =
    rawPageIndex !== String(search.pageIndex) ||
    rawPageSize !== String(search.pageSize) ||
    (rawQ?.trim() || undefined) !== search.q ||
    (rawMovementType?.trim() || undefined) !== search.movementType ||
    parsePositiveInt(rawProductId) !== search.productId;

  if (shouldCanonicalizeRequiredParams) {
    redirect(buildMovementsHref(search));
  }

  return (
    <>
      <RouteHeaderConfig title={t("pageTitles.movements")}>
        <MovementsMobileFilters search={search} />
      </RouteHeaderConfig>
      <div className="h-[calc(100dvh-56px-2rem)] min-h-0 min-w-0 overflow-hidden md:h-[calc(100dvh-56px-3rem)]">
        <MovementsPageContent search={search} />
      </div>
    </>
  );
}
