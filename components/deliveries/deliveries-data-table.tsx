"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Loader2Icon,
} from "lucide-react";

import { DataTableActionsMenu } from "@/components/datatable/data-table-actions-menu";
import { DataTableActiveFilterChips } from "@/components/datatable/data-table-active-filter-chips";
import { DataTableColumnVisibility } from "@/components/datatable/data-table-column-visibility";
import { DataTableCore } from "@/components/datatable/data-table-core";
import { getDataTableFilterVisibility } from "@/components/datatable/data-table-filter-visibility";
import { getAlignedHeaderMeta } from "@/components/datatable/data-table-meta";
import { DataTableMobileField } from "@/components/datatable/data-table-mobile-field";
import { DataTableMobileSkeletonList } from "@/components/datatable/data-table-mobile-skeleton-list";
import { DataTableMobileViewport } from "@/components/datatable/data-table-mobile-viewport";
import { DataTablePagination } from "@/components/datatable/data-table-pagination";
import { DataTableSearchInput } from "@/components/datatable/data-table-search-input";
import { DATA_TABLE_FILTER_TRIGGER_CLASSNAME } from "@/components/datatable/data-table-styles";
import { DataTableToolbar } from "@/components/datatable/data-table-toolbar";
import { DataTableViewport } from "@/components/datatable/data-table-viewport";
import DeliveryKindBadge from "@/components/delivery-kind-badge";
import {
  getDeliveryColumns,
} from "@/components/deliveries/deliveries-columns";
import { DeliveryProductsHistoryTable } from "@/components/deliveries/delivery-products-history-table";
import { DeliveryUpsertDialog } from "@/components/deliveries/delivery-upsert-dialog";
import { DateRangeFilter } from "@/components/daterange-filter";
import { MultiSelectFilter } from "@/components/form/multi-select-filter";
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
import { useClearTableSearch } from "@/hooks/use-clear-table-search";
import { useDataTableDefaultRenderers } from "@/hooks/use-data-table-default-renderers";
import { useDataTablePaginationNavigation } from "@/hooks/use-data-table-pagination-navigation";
import { useDataTablePaginationState } from "@/hooks/use-data-table-pagination-state";
import { useDebouncedTableSearchDraft } from "@/hooks/use-debounced-table-search-draft";
import { useDeliveriesSearchNavigation } from "@/hooks/use-deliveries-search-navigation";
import { convertToCurrencyFormat } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import { toClientError } from "@/lib/errors/client-error";
import { useDeliveryFilterOptions } from "@/lib/queries/delivery-filter-options";
import { useRemoveDeliveryMutation } from "@/lib/queries/deliveries-mutations";
import { getClientTimeZone } from "@/lib/timezone-client";
import type { DeliveryTableRow } from "@/lib/types/deliveries";
import {
  deliveriesSortFields,
  type DeliveriesSearch,
} from "@/lib/types/search";
import { cn } from "@/lib/utils";

type DeliveriesDataTableProps = {
  data: Array<DeliveryTableRow>;
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  search: DeliveriesSearch;
  enableColumnVisibility?: boolean;
  isLoading?: boolean;
  isRefetching?: boolean;
};

const DELIVERY_KIND_FALLBACK_VALUES = ["DELIVERY", "RETURN"] as const;

export function DeliveriesDataTable({
  data,
  total,
  pageIndex,
  pageSize,
  pageCount,
  search,
  enableColumnVisibility = true,
  isLoading = false,
  isRefetching = false,
}: DeliveriesDataTableProps) {
  const t = useTranslations("DeliveriesTable");
  const tTableFilters = useTranslations("Table.filters");
  const tDelete = useTranslations("DeliveriesTable.delete");
  const locale = useLocale();
  const timeZone = useMemo(() => getClientTimeZone(), []);
  const navigate = useDeliveriesSearchNavigation(search);
  const { data: filterOptions } = useDeliveryFilterOptions();
  const removeDeliveryMutation = useRemoveDeliveryMutation();
  const [editingDeliveryId, setEditingDeliveryId] = useState<number | null>(
    null,
  );
  const [deletingDelivery, setDeletingDelivery] =
    useState<DeliveryTableRow | null>(null);

  const formatDeliveryDate = useCallback(
    (value: string) =>
      formatDateTime(value, {
        locale,
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [locale, timeZone],
  );

  const onEditDelivery = useCallback(
    (delivery: DeliveryTableRow) => {
      setEditingDeliveryId(delivery.id);
    },
    [],
  );

  const onDeleteDelivery = useCallback(
    (deliveryId: number) => {
      const delivery = data.find((item) => item.id === deliveryId);
      if (!delivery) return;
      setDeletingDelivery(delivery);
    },
    [data],
  );

  const confirmDeleteDelivery = useCallback(async () => {
    if (!deletingDelivery || removeDeliveryMutation.isPending) return;

    try {
      await removeDeliveryMutation.mutateAsync({ id: deletingDelivery.id });
      toast.success(tDelete("toasts.deleteSuccess"));
      setDeletingDelivery(null);
    } catch (error) {
      const clientError = toClientError(error);
      if (clientError.code === "DELIVERY_NOT_FOUND") {
        toast.error(tDelete("toasts.deliveryNotFound"));
        setDeletingDelivery(null);
        return;
      }

      toast.error(tDelete("toasts.deleteFailed"));
    }
  }, [deletingDelivery, removeDeliveryMutation, tDelete]);

  const closeEditDialog = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setEditingDeliveryId(null);
    }
  }, []);

  const closeDeleteDialog = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setDeletingDelivery(null);
    }
  }, []);

  const closeDialogsAfterSave = useCallback(() => {
    setEditingDeliveryId(null);
  }, []);

  const columns = useMemo(
    () =>
      getDeliveryColumns(
        onEditDelivery,
        onDeleteDelivery,
        t,
        locale,
        timeZone,
      ),
    [locale, onDeleteDelivery, onEditDelivery, t, timeZone],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
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

  const clearSearchAndNavigate = useClearTableSearch<DeliveriesSearch>({
    navigate,
    cancelSearchDebounce,
    clearSearchDraft,
  });

  const { onPageSizeChange, onPrev, onNext } =
    useDataTablePaginationNavigation<DeliveriesSearch>({
      navigate,
      pageIndex,
    });

  const {
    getDesktopHeaderClassName,
    renderDesktopBodyCell,
    getDesktopCellClassName,
  } = useDataTableDefaultRenderers<DeliveryTableRow>();

  const kinds = useMemo(
    () =>
      (filterOptions?.kinds?.length
        ? filterOptions.kinds
        : DELIVERY_KIND_FALLBACK_VALUES
      ).map((value) => ({
        value,
        label: value === "RETURN" ? t("kinds.return") : t("kinds.delivery"),
      })),
    [filterOptions?.kinds, t],
  );

  const customerOptions = useMemo(
    () =>
      (filterOptions?.customers ?? []).map((customer) => ({
        value: String(customer.id),
        label: customer.name,
      })),
    [filterOptions?.customers],
  );

  const selectedKinds = useMemo(
    () =>
      search.kind
        ? search.kind
            .split("|")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    [search.kind],
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

  const customerLabelById = useMemo(
    () =>
      new Map(
        (filterOptions?.customers ?? []).map((customer) => [
          String(customer.id),
          customer.name,
        ]),
      ),
    [filterOptions?.customers],
  );

  const activeFilterChips = useMemo(() => {
    const chips: Array<{
      type: "kind" | "customer" | "dateRange";
      value: string;
      label: string;
    }> = [];

    for (const kindValue of selectedKinds) {
      chips.push({
        type: "kind",
        value: kindValue,
        label: `${t("columns.kind")}: ${
          kindValue === "RETURN" ? t("kinds.return") : t("kinds.delivery")
        }`,
      });
    }

    for (const customerValue of selectedCustomers) {
      chips.push({
        type: "customer",
        value: customerValue,
        label: `${t("columns.customer")}: ${
          customerLabelById.get(customerValue) ?? customerValue
        }`,
      });
    }

    if (search.startDate || search.endDate) {
      const formattedStart = search.startDate
        ? formatDateTime(`${search.startDate}T00:00:00`, {
            locale,
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : "...";
      const formattedEnd = search.endDate
        ? formatDateTime(`${search.endDate}T00:00:00`, {
            locale,
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : "...";

      chips.push({
        type: "dateRange",
        value: `${search.startDate ?? ""}_${search.endDate ?? ""}`,
        label: `${tTableFilters("range")}: ${formattedStart} - ${formattedEnd}`,
      });
    }

    return chips;
  }, [
    customerLabelById,
    locale,
    search.endDate,
    search.startDate,
    selectedCustomers,
    selectedKinds,
    t,
    tTableFilters,
    timeZone,
  ]);

  const hasActiveSearch = Boolean(search.q?.trim());
  const hasSecondaryFilters = Boolean(kinds.length || customerOptions.length);
  const hasActiveSecondaryFilters = Boolean(
    search.kind || search.customerId || search.startDate || search.endDate,
  );
  const { hasAnyActiveFilters, showClearAllButton, showFilterChips } =
    getDataTableFilterVisibility({
      hasSecondaryFilters,
      hasActiveSearch,
      hasActiveSecondaryFilters,
    });

  const renderDesktopHeaderCell = useCallback(
    (header: Header<DeliveryTableRow, unknown>) => {
      const rawSortKey = header.column.columnDef.meta?.sortKey;
      const { headerAlign, headerJustifyClass, headerLabel } =
        getAlignedHeaderMeta(header);
      const sortKey = deliveriesSortFields.includes(
        rawSortKey as (typeof deliveriesSortFields)[number],
      )
        ? (rawSortKey as DeliveriesSearch["sortBy"])
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
                  columnId: "kind",
                  label: t("columns.kind"),
                  options: kinds,
                }}
                selectedValues={selectedKinds}
                onChange={(_columnId, selectedValues) =>
                  navigate({
                    kind:
                      selectedValues.length > 0
                        ? selectedValues.join("|")
                        : undefined,
                    pageIndex: 0,
                  })
                }
                triggerClassName={cn(
                  "md:w-44",
                  DATA_TABLE_FILTER_TRIGGER_CLASSNAME,
                )}
              />

              {customerOptions.length > 1 ? (
                <MultiSelectFilter
                  filter={{
                    columnId: "customerId",
                    label: t("columns.customer"),
                    options: customerOptions,
                  }}
                  selectedValues={selectedCustomers}
                  onChange={(_columnId, selectedValues) =>
                    navigate({
                      customerId:
                        selectedValues.length > 0
                          ? selectedValues.join("|")
                          : undefined,
                      pageIndex: 0,
                    })
                  }
                  triggerClassName={cn(
                    "md:w-56",
                    DATA_TABLE_FILTER_TRIGGER_CLASSNAME,
                  )}
                />
              ) : null}

              <DateRangeFilter
                label={tTableFilters("range")}
                start={search.startDate}
                end={search.endDate}
                className={cn("md:w-56", DATA_TABLE_FILTER_TRIGGER_CLASSNAME)}
                onChange={({ startDate, endDate }) =>
                  navigate({
                    startDate,
                    endDate,
                    pageIndex: 0,
                  })
                }
              />

              {showClearAllButton ? (
                <Button
                  type="button"
                  variant="outline"
                  className={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                  disabled={!hasAnyActiveFilters}
                  onClick={() => {
                    clearSearchAndNavigate(
                      {
                        kind: undefined,
                        customerId: undefined,
                        startDate: undefined,
                        endDate: undefined,
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
              clearChipLabel={t("filters.clearChip")}
              getChipKey={(chip) => `${chip.type}:${chip.value}`}
              getChipLabel={(chip) => chip.label}
              onRemove={(chip) => {
                if (chip.type === "kind") {
                  const next = selectedKinds.filter((value) => value !== chip.value);
                  navigate({
                    kind: next.length > 0 ? next.join("|") : undefined,
                    pageIndex: 0,
                  });
                  return;
                }

                if (chip.type === "customer") {
                  const next = selectedCustomers.filter(
                    (value) => value !== chip.value,
                  );
                  navigate({
                    customerId: next.length > 0 ? next.join("|") : undefined,
                    pageIndex: 0,
                  });
                  return;
                }

                navigate({
                  startDate: undefined,
                  endDate: undefined,
                  pageIndex: 0,
                });
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
                  <Card key={`delivery-mobile-skeleton-${index}`} size="sm" className="gap-3">
                    <CardHeader className="border-b pb-3">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2">
                      {Array.from({ length: 3 }).map((__, fieldIndex) => (
                        <div
                          key={`delivery-mobile-skeleton-field-${fieldIndex}`}
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
              {data.map((delivery) => (
                <Card key={delivery.id} size="sm" className="gap-3">
                  <CardHeader className="border-b pb-3">
                    <CardTitle className="truncate">{delivery.deliveryNumber}</CardTitle>
                    <CardDescription className="truncate">
                      {formatDeliveryDate(delivery.deliveryDate)}
                    </CardDescription>
                    <CardAction>
                      <DataTableActionsMenu
                        items={[
                          {
                            key: `edit-${delivery.id}`,
                            label: t("actions.edit"),
                            onSelect: () => onEditDelivery(delivery),
                          },
                          {
                            key: `delete-${delivery.id}`,
                            label: t("actions.delete"),
                            onSelect: () => onDeleteDelivery(delivery.id),
                            destructive: true,
                          },
                        ]}
                      />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2">
                    <DataTableMobileField
                      label={t("columns.customer")}
                      value={delivery.customerName ?? "-"}
                    />
                    <DataTableMobileField
                      label={t("columns.kind")}
                      value={
                        <DeliveryKindBadge
                          kind={delivery.kind}
                          label={
                            delivery.kind === "RETURN"
                              ? t("kinds.return")
                              : t("kinds.delivery")
                          }
                        />
                      }
                    />
                    <DataTableMobileField
                      label={t("columns.totalAmount")}
                      value={convertToCurrencyFormat({
                        cents: Math.round(Number(delivery.totalAmount ?? 0)),
                        currency:
                          (delivery.currency as "TRY" | "USD" | "EUR") || "TRY",
                      })}
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
            renderExpandedRow={(row) => (
              <DeliveryProductsHistoryTable deliveryId={row.id} />
            )}
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

      {editingDeliveryId !== null ? (
        <DeliveryUpsertDialog
          mode="edit"
          open
          deliveryId={editingDeliveryId}
          onOpenChange={closeEditDialog}
          onSaved={closeDialogsAfterSave}
        />
      ) : null}

      <AlertDialog
        open={deletingDelivery !== null}
        onOpenChange={closeDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDelete("dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tDelete("dialogDescription", {
                deliveryNumber: deletingDelivery?.deliveryNumber ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeDeliveryMutation.isPending}>
              {tDelete("buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeDeliveryMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteDelivery();
              }}
            >
              {removeDeliveryMutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {tDelete("buttons.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
