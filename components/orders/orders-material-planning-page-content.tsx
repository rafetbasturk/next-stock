"use client";

import { useTranslations } from "next-intl";

import { OrdersMaterialPlanningDataTable } from "@/components/orders/orders-material-planning-data-table";
import { useOrdersMaterialPlanningPaginated } from "@/lib/queries/orders-material-planning-paginated";
import type { MaterialPlanningSearch } from "@/lib/types/search";

type OrdersMaterialPlanningPageContentProps = {
  search: MaterialPlanningSearch;
};

export function OrdersMaterialPlanningPageContent({
  search,
}: OrdersMaterialPlanningPageContentProps) {
  const t = useTranslations("MaterialPlanningTable");
  const { data, isError, isPending, isFetching } =
    useOrdersMaterialPlanningPaginated(search);

  if (isError) {
    return (
      <section
        aria-labelledby="page-title"
        className="text-muted-foreground flex h-full min-h-0 items-center justify-center rounded-md border"
      >
        <p>{t("errors.loadFailed")}</p>
      </section>
    );
  }

  const paginated = data ?? {
    data: [],
    pageIndex: search.pageIndex,
    pageSize: search.pageSize,
    total: 0,
    pageCount: 0,
  };

  return (
    <OrdersMaterialPlanningDataTable
      data={paginated.data}
      total={paginated.total}
      pageIndex={paginated.pageIndex}
      pageSize={paginated.pageSize}
      pageCount={paginated.pageCount}
      search={search}
      isLoading={isPending && !data}
      isRefetching={isFetching && !!data}
    />
  );
}
