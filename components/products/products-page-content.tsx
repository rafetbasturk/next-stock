"use client";

import { ProductsDataTable } from "@/components/products/products-data-table";
import { useProductsPaginated } from "@/lib/queries/products-paginated";
import type { ProductsSearch } from "@/lib/types/search";
import { useTranslations } from "next-intl";
import type { VisibilityState } from "@tanstack/react-table";

type ProductsPageContentProps = {
  search: ProductsSearch;
};

export function ProductsPageContent({ search }: ProductsPageContentProps) {
  const t = useTranslations("ProductsTable");
  const { data, isError, isPending, isFetching } = useProductsPaginated(search);

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

  const initialColumnVisibility: VisibilityState = {
    price: false,
    specs: false,
    specsNet: false,
    notes: false,
    customer: false,
  };

  return (
    <ProductsDataTable
      data={paginated.data}
      total={paginated.total}
      pageIndex={paginated.pageIndex}
      pageSize={paginated.pageSize}
      pageCount={paginated.pageCount}
      search={search}
      initialColumnVisibility={initialColumnVisibility}
      isLoading={isPending && !data}
      isRefetching={isFetching && !!data}
    />
  );
}
