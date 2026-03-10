"use client";

import { useTranslations } from "next-intl";

import { OrdersDataTable } from "@/components/orders/orders-data-table";
import { useOrdersPaginated } from "@/lib/queries/orders-paginated";
import type { OrdersSearch } from "@/lib/types/search";

type OrdersPageContentProps = {
  search: OrdersSearch;
};

export function OrdersPageContent({ search }: OrdersPageContentProps) {
  const t = useTranslations("OrdersTable");
  const { data, isError, isPending, isFetching } = useOrdersPaginated(search);

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
    <OrdersDataTable
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
