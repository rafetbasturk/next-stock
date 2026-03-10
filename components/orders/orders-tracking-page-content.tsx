"use client";

import { useTranslations } from "next-intl";

import { OrdersTrackingDataTable } from "@/components/orders/orders-tracking-data-table";
import { useOrdersTrackingPaginated } from "@/lib/queries/orders-tracking-paginated";
import type { OrderTrackingSearch } from "@/lib/types/search";

type OrdersTrackingPageContentProps = {
  search: OrderTrackingSearch;
};

export function OrdersTrackingPageContent({
  search,
}: OrdersTrackingPageContentProps) {
  const t = useTranslations("OrderTrackingTable");
  const { data, isError, isPending, isFetching } =
    useOrdersTrackingPaginated(search);

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
    <OrdersTrackingDataTable
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
