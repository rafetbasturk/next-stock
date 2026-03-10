"use client";

import { MovementsDataTable } from "@/components/movements/movements-data-table";
import { useMovementsPaginated } from "@/lib/queries/movements-paginated";
import type { StockSearch } from "@/lib/types/search";
import { useTranslations } from "next-intl";

type MovementsPageContentProps = {
  search: StockSearch;
};

export function MovementsPageContent({ search }: MovementsPageContentProps) {
  const t = useTranslations("MovementsTable");
  const { data, isError, isPending, isFetching } = useMovementsPaginated(search);

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
    <MovementsDataTable
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
