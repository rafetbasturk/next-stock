"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import {
  getCoreRowModel,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTableActionsMenu } from "@/components/datatable/data-table-actions-menu";
import { DataTableCore } from "@/components/datatable/data-table-core";
import { getAlignedHeaderMeta } from "@/components/datatable/data-table-meta";
import { DataTableMobileField } from "@/components/datatable/data-table-mobile-field";
import { DataTableMobileSkeletonList } from "@/components/datatable/data-table-mobile-skeleton-list";
import { DataTableMobileViewport } from "@/components/datatable/data-table-mobile-viewport";
import { DataTablePagination } from "@/components/datatable/data-table-pagination";
import { DataTableViewport } from "@/components/datatable/data-table-viewport";
import { getMaterialPlanningColumns } from "@/components/orders/material-planning-columns";
import { EditProductDialog } from "@/components/products/edit-product-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataTableDefaultRenderers } from "@/hooks/use-data-table-default-renderers";
import { useDataTablePaginationNavigation } from "@/hooks/use-data-table-pagination-navigation";
import { useDataTablePaginationState } from "@/hooks/use-data-table-pagination-state";
import { useOrdersMaterialPlanningSearchNavigation } from "@/hooks/use-orders-material-planning-search-navigation";
import { useProductDetail } from "@/lib/queries/product-detail";
import { toClientError } from "@/lib/errors/client-error";
import type { MaterialPlanningTableRow } from "@/lib/types/orders";
import type { ProductTableRow } from "@/lib/types/products";
import {
  materialPlanningSortFields,
  type MaterialPlanningSearch,
} from "@/lib/types/search";
import { cn } from "@/lib/utils";

type OrdersMaterialPlanningDataTableProps = {
  data: Array<MaterialPlanningTableRow>;
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  search: MaterialPlanningSearch;
  isLoading?: boolean;
  isRefetching?: boolean;
};

export function OrdersMaterialPlanningDataTable({
  data,
  total,
  pageIndex,
  pageSize,
  pageCount,
  search,
  isLoading = false,
  isRefetching = false,
}: OrdersMaterialPlanningDataTableProps) {
  const t = useTranslations("MaterialPlanningTable");
  const navigate = useOrdersMaterialPlanningSearchNavigation(search);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const productDetailQuery = useProductDetail(editingProductId ?? 0, Boolean(editingProductId));

  useEffect(() => {
    if (!editingProductId || !productDetailQuery.error) return;

    toast.error(toClientError(productDetailQuery.error).message);
    setEditingProductId(null);
  }, [editingProductId, productDetailQuery.error]);

  const editingProduct = useMemo<ProductTableRow | null>(() => {
    if (!productDetailQuery.data) {
      return null;
    }

    const product = productDetailQuery.data;

    return {
      id: product.id,
      customerId: product.customerId,
      code: product.code,
      name: product.name,
      customerName: product.customerName,
      material: product.material,
      price: product.price,
      currency: product.currency,
      stockQuantity: product.stockQuantity,
      minStockLevel: product.minStockLevel,
      unit: product.unit,
      specs: product.specs ?? "",
      specsNet: product.specsNet ?? "",
      postProcess: product.postProcess ?? "",
      coating: product.coating ?? "",
      notes: product.notes ?? "",
      otherCodes: product.otherCodes ?? "",
    };
  }, [productDetailQuery.data]);

  const handleEditProduct = useCallback((productId: number) => {
    setEditingProductId(productId);
  }, []);

  const columns = useMemo(
    () =>
      getMaterialPlanningColumns(t, {
        onEditProduct: handleEditProduct,
        editingProductId,
        isEditLoading: productDetailQuery.isFetching,
      }),
    [editingProductId, handleEditProduct, productDetailQuery.isFetching, t],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { fromRow, toRow, hasPrev, hasNext, pageSizeOptions } =
    useDataTablePaginationState({
      total,
      pageIndex,
      pageSize,
      pageCount,
    });

  const { onPageSizeChange, onPrev, onNext } =
    useDataTablePaginationNavigation<MaterialPlanningSearch>({
      navigate,
      pageIndex,
    });

  const {
    getDesktopHeaderClassName,
    renderDesktopBodyCell,
    getDesktopCellClassName,
  } = useDataTableDefaultRenderers<MaterialPlanningTableRow>();

  const renderDesktopHeaderCell = useCallback(
    (header: Header<MaterialPlanningTableRow, unknown>) => {
      const rawSortKey = header.column.columnDef.meta?.sortKey;
      const { headerAlign, headerJustifyClass, headerLabel } =
        getAlignedHeaderMeta(header);
      const sortKey = materialPlanningSortFields.includes(
        rawSortKey as (typeof materialPlanningSortFields)[number],
      )
        ? (rawSortKey as MaterialPlanningSearch["sortBy"])
        : undefined;
      const isSortedColumn = sortKey === search.sortBy;
      const icon = !isSortedColumn ? (
        <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
      ) : search.sortDir === "desc" ? (
        <ArrowDownIcon className="size-3.5 text-muted-foreground" />
      ) : (
        <ArrowUpIcon className="size-3.5 text-muted-foreground" />
      );

      if (!sortKey) {
        return (
          <div className={cn("flex items-center", headerJustifyClass)}>
            {headerLabel}
          </div>
        );
      }

      return (
        <div className={cn("flex items-center", headerJustifyClass)}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 px-2", headerAlign === "left" && "-ml-2")}
            onClick={() =>
              navigate({
                pageIndex: 0,
                sortBy: sortKey,
                sortDir:
                  isSortedColumn && search.sortDir === "asc" ? "desc" : "asc",
              })
            }
          >
            {headerLabel}
            {icon}
          </Button>
        </div>
      );
    },
    [navigate, search.sortBy, search.sortDir],
  );

  return (
    <section
      aria-labelledby="page-title"
      className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-md border"
    >
      <DataTableViewport
        isRefetching={isRefetching}
        updatingLabel={t("updating")}
        mobile={
          <DataTableMobileViewport
            isLoading={isLoading}
            isEmpty={data.length === 0}
            emptyLabel={t("empty")}
            loadingContent={
              <DataTableMobileSkeletonList
                count={6}
                renderItem={(index) => (
                  <Card
                    key={`material-planning-mobile-skeleton-${index}`}
                    size="sm"
                    className="gap-3"
                  >
                    <CardHeader className="border-b pb-3">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2">
                      {Array.from({ length: 5 }).map((__, fieldIndex) => (
                        <div
                          key={`material-planning-mobile-skeleton-field-${fieldIndex}`}
                          className="space-y-1"
                        >
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              />
            }
          >
            <div className="space-y-3">
              {data.map((row) => (
                <Card key={row.productId} size="sm" className="gap-3">
                  <CardHeader className="border-b pb-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{row.productName}</CardTitle>
                      <CardDescription className="truncate">
                        {row.productCode}
                      </CardDescription>
                    </div>
                    <CardAction>
                      <DataTableActionsMenu
                        srLabel={t("actions.openMenu")}
                        items={[
                          {
                            key: "edit-product",
                            label:
                              productDetailQuery.isFetching &&
                              editingProductId === row.productId
                                ? t("actions.loadingProduct")
                                : t("actions.editProduct"),
                            disabled:
                              productDetailQuery.isFetching &&
                              editingProductId === row.productId,
                            onSelect: () => handleEditProduct(row.productId),
                          },
                        ]}
                      />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2">
                    <DataTableMobileField
                      label={t("columns.purchaseQuantity")}
                      value={
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {row.purchaseQuantity}
                        </span>
                      }
                    />
                    <DataTableMobileField
                      label={t("columns.openOrderQuantity")}
                      value={row.openOrderQuantity}
                    />
                    <DataTableMobileField
                      label={t("columns.stock")}
                      value={row.stockQuantity}
                    />
                    <DataTableMobileField
                      label={t("columns.material")}
                      value={row.material?.trim() || "-"}
                    />
                    <DataTableMobileField
                      label={t("columns.specs")}
                      value={row.specs?.trim() || "-"}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </DataTableMobileViewport>
        }
        desktop={
          <DataTableCore
            table={table}
            isLoading={isLoading}
            emptyLabel={t("empty")}
            skeletonRowCount={8}
            containerClassName="hidden h-full min-h-0 min-w-0 overflow-auto lg:block"
            renderHeaderCell={renderDesktopHeaderCell}
            renderBodyCell={renderDesktopBodyCell}
            getHeaderClassName={getDesktopHeaderClassName}
            getCellClassName={getDesktopCellClassName}
          />
        }
      />

      <DataTablePagination
        showingLabel={t("showing", { from: fromRow, to: toRow, total })}
        rowsPerPageLabel={t("rowsPerPage")}
        pageLabel={t("page", {
          current: pageIndex + 1,
          total: Math.max(1, pageCount),
        })}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPageSizeChange={onPageSizeChange}
        onPrev={onPrev}
        onNext={onNext}
      />

      {editingProductId && editingProduct ? (
        <EditProductDialog
          product={editingProduct}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingProductId(null);
            }
          }}
        />
      ) : null}
    </section>
  );
}
