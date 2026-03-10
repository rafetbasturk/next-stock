"use client";

import { useTranslations } from "next-intl";

import { DeliveriesDataTable } from "@/components/deliveries/deliveries-data-table";
import { useDeliveriesPaginated } from "@/lib/queries/deliveries-paginated";
import type { DeliveriesSearch } from "@/lib/types/search";

type DeliveriesPageContentProps = {
  search: DeliveriesSearch;
};

export function DeliveriesPageContent({ search }: DeliveriesPageContentProps) {
  const t = useTranslations("DeliveriesTable");
  const { data, isError, isPending, isFetching } = useDeliveriesPaginated(search);

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
    <DeliveriesDataTable
      data={paginated.data}
      total={paginated.total}
      pageIndex={paginated.pageIndex}
      pageSize={paginated.pageSize}
      pageCount={paginated.pageCount}
      search={search}
      isLoading={isPending && !data}
      isRefetching={isFetching && !!data}
      enableColumnVisibility={false}
    />
  );
}
