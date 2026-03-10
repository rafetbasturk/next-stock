"use client";

import { useTranslations } from "next-intl";

import { CustomersDataTable } from "@/components/customers/customers-data-table";
import { useCustomersPaginated } from "@/lib/queries/customers-paginated";
import type { CustomersSearch } from "@/lib/types/search";

type CustomersPageContentProps = {
  search: CustomersSearch;
};

export function CustomersPageContent({ search }: CustomersPageContentProps) {
  const t = useTranslations("CustomersTable");
  const { data, isError, isPending, isFetching } =
    useCustomersPaginated(search);

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
    <CustomersDataTable
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
