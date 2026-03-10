"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  getCoreRowModel,
  useReactTable,
  type Header,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  Loader2Icon,
} from "lucide-react";

import { MultiSelectFilter } from "@/components/form/multi-select-filter";
import { DataTableActiveFilterChips } from "@/components/datatable/data-table-active-filter-chips";
import { DataTableActionsMenu } from "@/components/datatable/data-table-actions-menu";
import { DataTableCore } from "@/components/datatable/data-table-core";
import { DataTableColumnVisibility } from "@/components/datatable/data-table-column-visibility";
import { getDataTableFilterVisibility } from "@/components/datatable/data-table-filter-visibility";
import {
  getAlignedHeaderMeta,
} from "@/components/datatable/data-table-meta";
import { DataTableMobileField } from "@/components/datatable/data-table-mobile-field";
import { DataTableMobileSkeletonList } from "@/components/datatable/data-table-mobile-skeleton-list";
import { DataTableMobileViewport } from "@/components/datatable/data-table-mobile-viewport";
import { DataTablePagination } from "@/components/datatable/data-table-pagination";
import { DataTableSearchInput } from "@/components/datatable/data-table-search-input";
import { DATA_TABLE_FILTER_TRIGGER_CLASSNAME } from "@/components/datatable/data-table-styles";
import { DataTableToolbar } from "@/components/datatable/data-table-toolbar";
import { DataTableViewport } from "@/components/datatable/data-table-viewport";
import { Button } from "@/components/ui/button";
import { AdjustProductStockDialog } from "@/components/products/adjust-product-stock-dialog";
import { EditProductDialog } from "@/components/products/edit-product-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  productSortFields,
  type ProductsSearch,
} from "@/lib/types/search";
import { useProductFilterOptions } from "@/lib/queries/product-filter-options";
import { useRemoveProductMutation } from "@/lib/queries/products-mutations";
import { convertToCurrencyFormat } from "@/lib/currency";
import { toClientError } from "@/lib/errors/client-error";
import { useProductsSearchNavigation } from "@/hooks/use-products-search-navigation";
import { useDebouncedTableSearchDraft } from "@/hooks/use-debounced-table-search-draft";
import { useClearTableSearch } from "@/hooks/use-clear-table-search";
import { useDataTableDefaultRenderers } from "@/hooks/use-data-table-default-renderers";
import { useDataTablePaginationNavigation } from "@/hooks/use-data-table-pagination-navigation";
import { useDataTablePaginationState } from "@/hooks/use-data-table-pagination-state";
import { usePersistedColumnVisibility } from "@/hooks/use-persisted-column-visibility";
import {
  getProductColumns,
} from "@/components/products/products-columns";
import type { ProductTableRow } from "@/lib/types/products";

type ProductsDataTableProps = {
  data: Array<ProductTableRow>;
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  search: ProductsSearch;
  initialColumnVisibility?: VisibilityState;
  enableColumnVisibility?: boolean;
  isLoading?: boolean;
  isRefetching?: boolean;
};

export function ProductsDataTable({
  data,
  total,
  pageIndex,
  pageSize,
  pageCount,
  search,
  initialColumnVisibility,
  enableColumnVisibility = true,
  isLoading = false,
  isRefetching = false,
}: ProductsDataTableProps) {
  const t = useTranslations("ProductsTable");
  const router = useRouter();
  const navigate = useProductsSearchNavigation(search);
  const [columnVisibility, setColumnVisibility] = usePersistedColumnVisibility({
    storageKey: "products:columnVisibility:v1",
    initialVisibility: initialColumnVisibility,
    loadBaseVisibility: initialColumnVisibility,
  });
  const { data: filterOptions } = useProductFilterOptions();
  const removeProductMutation = useRemoveProductMutation();
  const [editingProduct, setEditingProduct] = useState<ProductTableRow | null>(
    null,
  );
  const [deletingProduct, setDeletingProduct] =
    useState<ProductTableRow | null>(null);
  const [adjustingStockProduct, setAdjustingStockProduct] =
    useState<ProductTableRow | null>(null);

  const onEditProduct = useCallback((product: ProductTableRow) => {
    setEditingProduct(product);
  }, []);

  const onDeleteProduct = useCallback((product: ProductTableRow) => {
    setDeletingProduct(product);
  }, []);

  const onAdjustStock = useCallback((product: ProductTableRow) => {
    setAdjustingStockProduct(product);
  }, []);

  const openProductDetail = useCallback(
    (productId: number) => {
      router.push(`/products/${productId}`, { scroll: false });
    },
    [router],
  );

  const confirmDeleteProduct = useCallback(async () => {
    if (!deletingProduct || removeProductMutation.isPending) return;

    try {
      await removeProductMutation.mutateAsync({ id: deletingProduct.id });
      toast.success(t("delete.toasts.deleteSuccess"));
      setDeletingProduct(null);
    } catch (error) {
      const clientError = toClientError(error);
      if (clientError.code === "PRODUCT_HAS_STOCK") {
        toast.error(t("delete.toasts.productHasStock"));
        return;
      }
      if (clientError.code === "PRODUCT_NOT_FOUND") {
        toast.error(t("delete.toasts.productNotFound"));
        setDeletingProduct(null);
        return;
      }

      toast.error(t("delete.toasts.deleteFailed"));
    }
  }, [deletingProduct, removeProductMutation, t]);

  const columns = useMemo(
    () =>
      getProductColumns({
        onEdit: onEditProduct,
        onAdjustStock,
        onDelete: onDeleteProduct,
        t,
      }),
    [onAdjustStock, onDeleteProduct, onEditProduct, t],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const { fromRow, toRow, hasPrev, hasNext, pageSizeOptions } =
    useDataTablePaginationState({
      total,
      pageIndex,
      pageSize,
      pageCount,
    });
  const commitSearch = useCallback(
    (value: string | undefined, options?: { replace?: boolean }) => {
      navigate(
        {
          q: value,
          pageIndex: 0,
        },
        options,
      );
    },
    [navigate],
  );
  const {
    searchDraft,
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    handleSearchEnter,
    cancelSearchDebounce,
    clearSearchDraft,
  } = useDebouncedTableSearchDraft({
    searchValue: search.q,
    onCommit: commitSearch,
    debounceMs: 600,
  });
  const clearSearchAndNavigate = useClearTableSearch<ProductsSearch>({
    navigate,
    cancelSearchDebounce,
    clearSearchDraft,
  });
  const { onPageSizeChange, onPrev, onNext } =
    useDataTablePaginationNavigation<ProductsSearch>({
      navigate,
      pageIndex,
    });

  const selectedMaterials = useMemo(
    () =>
      search.material
        ? search.material
            .split("|")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    [search.material],
  );
  const selectedCustomers = useMemo(
    () =>
      search.customerId
        ? search.customerId
            .split("|")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    [search.customerId],
  );

  const materialFilterOptions = useMemo(
    () =>
      (filterOptions?.materials ?? []).map((material) => ({
        value: material,
        label: material,
      })),
    [filterOptions?.materials],
  );
  const customerFilterOptions = useMemo(
    () =>
      (filterOptions?.customers ?? []).map((customer) => ({
        value: String(customer.id),
        label: `${customer.code} - ${customer.name}`,
      })),
    [filterOptions?.customers],
  );
  const showCustomerFilter = customerFilterOptions.length > 1;
  const customerLabelById = useMemo(
    () =>
      new Map(
        (filterOptions?.customers ?? []).map((customer) => [
          String(customer.id),
          `${customer.code} - ${customer.name}`,
        ]),
      ),
    [filterOptions?.customers],
  );
  const activeFilterChips = useMemo(() => {
    const chips: Array<{
      type: "material" | "customer";
      value: string;
      label: string;
    }> = [];

    for (const materialValue of selectedMaterials) {
      chips.push({
        type: "material",
        value: materialValue,
        label: `${t("columns.material")}: ${materialValue}`,
      });
    }

    if (showCustomerFilter) {
      for (const customerValue of selectedCustomers) {
        chips.push({
          type: "customer",
          value: customerValue,
          label: `${t("columns.customer")}: ${
            customerLabelById.get(customerValue) ?? customerValue
          }`,
        });
      }
    }

    return chips;
  }, [
    customerLabelById,
    selectedCustomers,
    selectedMaterials,
    showCustomerFilter,
    t,
  ]);

  const hasActiveSearch = Boolean(search.q?.trim());
  const hasSecondaryFilters = materialFilterOptions.length > 0 || showCustomerFilter;
  const hasActiveSecondaryFilters = Boolean(search.material || search.customerId);
  const { hasAnyActiveFilters, showClearAllButton, showFilterChips } =
    getDataTableFilterVisibility({
      hasSecondaryFilters,
      hasActiveSearch,
      hasActiveSecondaryFilters,
    });
  const {
    getDesktopHeaderClassName,
    renderDesktopBodyCell,
    getDesktopCellClassName,
  } = useDataTableDefaultRenderers<ProductTableRow>();

  const toDisplayValue = (value: string | null | undefined) => {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : "-";
  };

  const renderDesktopHeaderCell = useCallback(
    (header: Header<ProductTableRow, unknown>) => {
      const rawSortKey = header.column.columnDef.meta?.sortKey;
      const { headerAlign, headerJustifyClass, headerLabel } =
        getAlignedHeaderMeta(header);
      const sortKey = productSortFields.includes(
        rawSortKey as (typeof productSortFields)[number],
      )
        ? (rawSortKey as ProductsSearch["sortBy"])
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
    <>
      <section
        aria-labelledby="page-title"
        className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-md border"
      >
        <DataTableToolbar
          left={
            <>
              <DataTableSearchInput
                label={t("filters.searchLabel")}
                className="grow"
                value={searchDraft}
                placeholder={t("filters.searchPlaceholder")}
                clearLabel={t("filters.clearSearch")}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onEnter={handleSearchEnter}
                onClear={() => {
                  clearSearchAndNavigate(undefined, { replace: true });
                }}
              />
              <MultiSelectFilter
                filter={{
                  columnId: "material",
                  label: t("columns.material"),
                  options: materialFilterOptions,
                }}
                selectedValues={selectedMaterials}
                triggerClassName={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                onChange={(_, selectedValues) => {
                  navigate({
                    material: selectedValues.length
                      ? selectedValues.join("|")
                      : undefined,
                    pageIndex: 0,
                  });
                }}
              />
              {showCustomerFilter ? (
                <MultiSelectFilter
                  filter={{
                    columnId: "customerId",
                    label: t("columns.customer"),
                    options: customerFilterOptions,
                  }}
                  selectedValues={selectedCustomers}
                  triggerClassName={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                  onChange={(_, selectedValues) => {
                    navigate({
                      customerId: selectedValues.length
                        ? selectedValues.join("|")
                        : undefined,
                      pageIndex: 0,
                    });
                  }}
                />
              ) : null}
              {showClearAllButton ? (
                <Button
                  type="button"
                  variant="outline"
                  className={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                  disabled={!hasAnyActiveFilters}
                  onClick={() => {
                    clearSearchAndNavigate(
                      {
                        material: undefined,
                        customerId: undefined,
                      },
                      { replace: true },
                    );
                  }}
                >
                  {t("filters.clearAll")}
                </Button>
              ) : null}
            </>
          }
          right={
            enableColumnVisibility ? (
              <DataTableColumnVisibility
                table={table}
                label={t("filters.columns")}
                triggerClassName={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                getColumnLabel={(column) =>
                  column.columnDef.meta?.headerLabel ?? column.id
                }
              />
            ) : null
          }
          chips={
            showFilterChips ? (
              <DataTableActiveFilterChips
                chips={activeFilterChips}
                clearChipLabel={t("filters.clearSearch")}
                getChipKey={(chip) => `${chip.type}:${chip.value}`}
                getChipLabel={(chip) => chip.label}
                onRemove={(chip) => {
                  if (chip.type === "material") {
                    const nextValues = selectedMaterials.filter(
                      (value) => value !== chip.value,
                    );
                    navigate(
                      {
                        material: nextValues.length
                          ? nextValues.join("|")
                          : undefined,
                        pageIndex: 0,
                      },
                      { replace: true },
                    );
                    return;
                  }

                  const nextValues = selectedCustomers.filter(
                    (value) => value !== chip.value,
                  );
                  navigate(
                    {
                      customerId: nextValues.length
                        ? nextValues.join("|")
                        : undefined,
                      pageIndex: 0,
                    },
                    { replace: true },
                  );
                }}
              />
            ) : null
          }
        />

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
                    key={`mobile-skeleton-${index}`}
                    size="sm"
                    className="gap-3"
                  >
                    <CardHeader className="border-b pb-3">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-3 gap-y-2">
                      {Array.from({ length: 8 }).map((__, fieldIndex) => (
                        <div
                          key={`mobile-skeleton-field-${fieldIndex}`}
                          className={cn(
                            "space-y-1",
                            fieldIndex > 5 && "col-span-2",
                          )}
                        >
                          <Skeleton className="h-3 w-16" />
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
              {data.map((product) => {
                const isLow =
                  product.stockQuantity <= (product.minStockLevel || 0);
                const formattedPrice = convertToCurrencyFormat({
                  cents: product.price ?? 0,
                  currency: product.currency,
                  style: "currency",
                });

                return (
                  <Card
                    key={product.id}
                    size="sm"
                    className="gap-3 cursor-pointer"
                    onClick={() => openProductDetail(product.id)}
                  >
                    <CardHeader className="border-b pb-3">
                      <CardTitle className="truncate">
                        {product.code}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {product.name}
                      </CardDescription>
                      <CardAction
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ProductCardActionsMenu
                          product={product}
                          onEdit={onEditProduct}
                          onAdjustStock={onAdjustStock}
                          onDelete={onDeleteProduct}
                          editLabel={t("actions.edit")}
                          adjustStockLabel={t("actions.adjustStock")}
                          deleteLabel={t("actions.delete")}
                        />
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <DataTableMobileField
                        label={t("columns.quantity")}
                        value={
                          <Badge variant={isLow ? "destructive" : "default"}>
                            {product.stockQuantity} {product.unit}
                          </Badge>
                        }
                      />
                      <DataTableMobileField
                        label={t("columns.material")}
                        value={toDisplayValue(product.material)}
                      />
                      <DataTableMobileField
                        label={t("columns.netSpecs")}
                        value={toDisplayValue(product.specsNet)}
                      />
                      <DataTableMobileField
                        label={t("columns.postProcess")}
                        value={toDisplayValue(product.postProcess)}
                      />
                      <DataTableMobileField
                        label={t("columns.coating")}
                        value={toDisplayValue(product.coating)}
                      />
                      <DataTableMobileField
                        label={t("columns.otherCodes")}
                        value={toDisplayValue(product.otherCodes)}
                      />
                      <DataTableMobileField
                        label={t("columns.notes")}
                        value={toDisplayValue(product.notes)}
                      />
                      <DataTableMobileField
                        label={t("columns.price")}
                        value={formattedPrice}
                      />
                      <DataTableMobileField
                        label={t("columns.customer")}
                        value={toDisplayValue(product.customerName)}
                      />
                    </CardContent>
                  </Card>
                );
              })}
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
              onRowClick={(row) => openProductDetail(row.id)}
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
      </section>

      {editingProduct ? (
        <EditProductDialog
          product={editingProduct}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingProduct(null);
            }
          }}
        />
      ) : null}

      {adjustingStockProduct ? (
        <AdjustProductStockDialog
          product={adjustingStockProduct}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setAdjustingStockProduct(null);
            }
          }}
        />
      ) : null}

      <AlertDialog
        open={Boolean(deletingProduct)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeletingProduct(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.dialogDescription", {
                code: deletingProduct?.code ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeProductMutation.isPending}>
              {t("delete.buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeProductMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteProduct();
              }}
            >
              {removeProductMutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {t("delete.buttons.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProductCardActionsMenu({
  product,
  onEdit,
  onAdjustStock,
  onDelete,
  editLabel,
  adjustStockLabel,
  deleteLabel,
}: {
  product: ProductTableRow;
  onEdit: (product: ProductTableRow) => void;
  onAdjustStock: (product: ProductTableRow) => void;
  onDelete: (product: ProductTableRow) => void;
  editLabel: string;
  adjustStockLabel: string;
  deleteLabel: string;
}) {
  return (
    <DataTableActionsMenu
      items={[
        {
          key: "edit",
          label: editLabel,
          onSelect: () => onEdit(product),
        },
        {
          key: "adjust-stock",
          label: adjustStockLabel,
          onSelect: () => onAdjustStock(product),
          separatorAfter: true,
        },
        {
          key: "delete",
          label: deleteLabel,
          onSelect: () => onDelete(product),
          destructive: true,
        },
      ]}
      stopPropagation
    />
  );
}
