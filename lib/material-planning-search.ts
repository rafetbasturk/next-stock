import {
  buildUrlSearchParams,
  firstParamValue,
  type SearchParamsInput,
} from "@/lib/search-params";
import {
  materialPlanningDefaultStatus,
  materialPlanningSearchSchema,
  type MaterialPlanningSearch,
} from "@/lib/types/search";

export function parseMaterialPlanningSearchParams(
  params: SearchParamsInput,
): MaterialPlanningSearch {
  return materialPlanningSearchSchema.parse({
    pageIndex: firstParamValue(params.pageIndex),
    pageSize: firstParamValue(params.pageSize),
    sortBy: firstParamValue(params.sortBy),
    sortDir: firstParamValue(params.sortDir),
    q: undefined,
    status: materialPlanningDefaultStatus,
    customerId: undefined,
    startDate: undefined,
    endDate: undefined,
  });
}

export function buildMaterialPlanningSearchParams(
  search: MaterialPlanningSearch,
): URLSearchParams {
  return buildUrlSearchParams([
    ["pageIndex", Math.max(0, search.pageIndex)],
    ["pageSize", search.pageSize],
    ["sortBy", search.sortBy],
    ["sortDir", search.sortDir],
  ]);
}

export function buildMaterialPlanningHref(
  search: MaterialPlanningSearch,
  updates?: Partial<MaterialPlanningSearch>,
): string {
  const next: MaterialPlanningSearch = {
    ...search,
    ...updates,
  };

  return `/material-planning?${buildMaterialPlanningSearchParams(
    next,
  ).toString()}`;
}

export function buildMaterialPlanningExportSearchParams(
  search: MaterialPlanningSearch,
): URLSearchParams {
  return buildUrlSearchParams([
    ["sortBy", search.sortBy],
    ["sortDir", search.sortDir],
  ]);
}
