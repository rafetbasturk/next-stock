"use client";

import { useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import {
  getCoreRowModel,
  useReactTable,
  type Header,
} from "@tanstack/react-table";

import { DataTableActiveFilterChips } from "@/components/datatable/data-table-active-filter-chips";
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
import { DateRangeFilter } from "@/components/daterange-filter";
import { MultiSelectFilter } from "@/components/form/multi-select-filter";
import {
  getOrderTrackingColumns,
  getOrderTrackingStatusLabel,
} from "@/components/orders/order-tracking-columns";
import StatusBadge from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { useOrdersTrackingSearchNavigation } from "@/hooks/use-orders-tracking-search-navigation";
import { convertToCurrencyFormat } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import { useOrderTrackingFilterOptions } from "@/lib/queries/order-tracking-filter-options";
import { getClientTimeZone } from "@/lib/timezone-client";
import type { OrderTrackingTableRow } from "@/lib/types/orders";
import {
  orderTrackingSortFields,
  type OrderTrackingSearch,
} from "@/lib/types/search";
import { cn } from "@/lib/utils";

type OrdersTrackingDataTableProps = {
  data: Array<OrderTrackingTableRow>;
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  search: OrderTrackingSearch;
  isLoading?: boolean;
  isRefetching?: boolean;
};

const ORDER_STATUS_FALLBACK_VALUES = [
  "KAYIT",
  "ÜRETİM",
  "KISMEN HAZIR",
  "HAZIR",
] as const;

export function OrdersTrackingDataTable({
  data,
  total,
  pageIndex,
  pageSize,
  pageCount,
  search,
  isLoading = false,
  isRefetching = false,
}: OrdersTrackingDataTableProps) {
  const t = useTranslations("OrderTrackingTable");
  const tTableFilters = useTranslations("Table.filters");
  const locale = useLocale();
  const timeZone = useMemo(() => getClientTimeZone(), []);
  const navigate = useOrdersTrackingSearchNavigation(search);
  const { data: filterOptions } = useOrderTrackingFilterOptions();

  const columns = useMemo(
    () => getOrderTrackingColumns(t, locale, timeZone),
    [locale, t, timeZone],
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

  const clearSearchAndNavigate = useClearTableSearch<OrderTrackingSearch>({
    navigate,
    cancelSearchDebounce,
    clearSearchDraft,
  });

  const { onPageSizeChange, onPrev, onNext } =
    useDataTablePaginationNavigation<OrderTrackingSearch>({
      navigate,
      pageIndex,
    });

  const {
    getDesktopHeaderClassName,
    renderDesktopBodyCell,
    getDesktopCellClassName,
  } = useDataTableDefaultRenderers<OrderTrackingTableRow>();

  const statusOptions = useMemo(
    () =>
      (filterOptions?.statuses?.length
        ? filterOptions.statuses
        : ORDER_STATUS_FALLBACK_VALUES
      ).map((value) => ({
        value,
        label: getOrderTrackingStatusLabel(value, t),
      })),
    [filterOptions, t],
  );

  const customerOptions = useMemo(
    () =>
      (filterOptions?.customers ?? []).map((customer) => ({
        value: String(customer.id),
        label: customer.name,
      })),
    [filterOptions?.customers],
  );

  const selectedStatuses = useMemo(
    () =>
      search.status
        ? search.status
            .split("|")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    [search.status],
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
      type: "status" | "customer" | "dateRange" | "shortage";
      value: string;
      label: string;
    }> = [];

    for (const statusValue of selectedStatuses) {
      chips.push({
        type: "status",
        value: statusValue,
        label: `${t("filters.status")}: ${getOrderTrackingStatusLabel(statusValue, t)}`,
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
        value: `${search.startDate ?? ""}|${search.endDate ?? ""}`,
        label: `${tTableFilters("range")}: ${formattedStart} - ${formattedEnd}`,
      });
    }

    if (search.shortageOnly) {
      chips.push({
        type: "shortage",
        value: "shortage",
        label: t("filters.shortageOnly"),
      });
    }

    return chips;
  }, [
    customerLabelById,
    locale,
    search.endDate,
    search.shortageOnly,
    search.startDate,
    selectedCustomers,
    selectedStatuses,
    t,
    tTableFilters,
    timeZone,
  ]);

  const hasActiveSearch = Boolean(search.q?.trim());
  const hasSecondaryFilters =
    statusOptions.length > 0 || customerOptions.length > 0;
  const hasActiveSecondaryFilters = Boolean(
    search.status ||
    search.customerId ||
    search.startDate ||
    search.endDate ||
    search.shortageOnly,
  );
  const { hasAnyActiveFilters, showClearAllButton, showFilterChips } =
    getDataTableFilterVisibility({
      hasSecondaryFilters,
      hasActiveSearch,
      hasActiveSecondaryFilters,
    });

  const renderDesktopHeaderCell = useCallback(
    (header: Header<OrderTrackingTableRow, unknown>) => {
      const rawSortKey = header.column.columnDef.meta?.sortKey;
      const { headerAlign, headerJustifyClass, headerLabel } =
        getAlignedHeaderMeta(header);
      const sortKey = orderTrackingSortFields.includes(
        rawSortKey as (typeof orderTrackingSortFields)[number],
      )
        ? (rawSortKey as OrderTrackingSearch["sortBy"])
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

  const formatOrderDate = useCallback(
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

  return (
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
                columnId: "customerId",
                label: t("columns.customer"),
                options: customerOptions,
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

            <MultiSelectFilter
              filter={{
                columnId: "status",
                label: t("filters.status"),
                options: statusOptions,
              }}
              selectedValues={selectedStatuses}
              triggerClassName={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
              onChange={(_, selectedValues) => {
                navigate({
                  status: selectedValues.length
                    ? selectedValues.join("|")
                    : undefined,
                  pageIndex: 0,
                });
              }}
            />

            <DateRangeFilter
              label={tTableFilters("range")}
              start={search.startDate}
              end={search.endDate}
              className={cn("md:w-56", DATA_TABLE_FILTER_TRIGGER_CLASSNAME)}
              clearLabel={tTableFilters("clear")}
              onChange={({ startDate, endDate }) => {
                navigate({
                  startDate,
                  endDate,
                  pageIndex: 0,
                });
              }}
            />

            <Button
              type="button"
              variant={search.shortageOnly ? "default" : "outline"}
              className={cn(
                "border-muted font-normal hover:bg-muted hover:text-foreground",
                search.shortageOnly
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
              onClick={() => {
                navigate({
                  shortageOnly: search.shortageOnly ? undefined : true,
                  pageIndex: 0,
                });
              }}
            >
              {t("filters.shortageOnly")}
            </Button>

            {showClearAllButton ? (
              <Button
                type="button"
                variant="outline"
                className={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                disabled={!hasAnyActiveFilters}
                onClick={() => {
                  clearSearchAndNavigate(
                    {
                      status: undefined,
                      customerId: undefined,
                      startDate: undefined,
                      endDate: undefined,
                      shortageOnly: undefined,
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
        chips={
          showFilterChips ? (
            <DataTableActiveFilterChips
              chips={activeFilterChips}
              clearChipLabel={t("filters.clearSearch")}
              getChipKey={(chip) => `${chip.type}:${chip.value}`}
              getChipLabel={(chip) => chip.label}
              onRemove={(chip) => {
                const nextStatuses =
                  chip.type === "status"
                    ? selectedStatuses.filter((value) => value !== chip.value)
                    : selectedStatuses;
                const nextCustomers =
                  chip.type === "customer"
                    ? selectedCustomers.filter((value) => value !== chip.value)
                    : selectedCustomers;

                navigate(
                  {
                    status: nextStatuses.length
                      ? nextStatuses.join("|")
                      : undefined,
                    customerId: nextCustomers.length
                      ? nextCustomers.join("|")
                      : undefined,
                    startDate:
                      chip.type === "dateRange" ? undefined : search.startDate,
                    endDate:
                      chip.type === "dateRange" ? undefined : search.endDate,
                    shortageOnly:
                      chip.type === "shortage"
                        ? undefined
                        : search.shortageOnly,
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
                    key={`order-tracking-mobile-skeleton-${index}`}
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
                          key={`order-tracking-mobile-skeleton-field-${fieldIndex}`}
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
                <Card
                  key={`${row.itemType}:${row.itemId}`}
                  size="sm"
                  className={cn(
                    "gap-3",
                    row.hasShortage && "border-red-300 dark:border-red-700",
                  )}
                >
                  <CardHeader className="border-b pb-3">
                    <CardTitle className="truncate">
                      {row.orderNumber} /{" "}
                      {t("mobile.lineLabel", {
                        lineNumber: row.lineNumber * 10,
                      })}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {formatOrderDate(row.orderDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2">
                    <DataTableMobileField
                      label={t("columns.materialName")}
                      value={
                        <div className="space-y-1">
                          <p className="font-medium">{row.materialName}</p>
                          <p className="text-muted-foreground text-xs">
                            {row.materialCode?.trim() || "-"}
                          </p>
                        </div>
                      }
                    />
                    <DataTableMobileField
                      label={t("columns.customer")}
                      value={
                        row.customerCode?.trim() || row.customerName?.trim()
                          ? `${row.customerCode ?? "-"} - ${row.customerName ?? "-"}`
                          : "-"
                      }
                    />
                    <DataTableMobileField
                      label={t("columns.status")}
                      value={
                        <StatusBadge
                          status={row.status}
                          label={getOrderTrackingStatusLabel(row.status, t)}
                        />
                      }
                    />
                    <DataTableMobileField
                      label={t("columns.remainingQuantity")}
                      value={row.remainingQuantity}
                    />
                    <DataTableMobileField
                      label={t("columns.stock")}
                      value={
                        <span
                          className={cn(
                            row.hasShortage &&
                              "font-semibold text-red-600 dark:text-red-400",
                          )}
                        >
                          {row.stockQuantity ?? "-"}
                        </span>
                      }
                    />
                    <DataTableMobileField
                      label={t("columns.unitPrice")}
                      value={`${convertToCurrencyFormat({
                        cents: row.unitPrice,
                        locale,
                        style: "decimal",
                      })} ${row.currency ?? ""}`.trim()}
                    />
                    <DataTableMobileField
                      label={t("columns.deliveryHistory")}
                      value={
                        row.deliveryHistory.length > 0 ? (
                          <div className="space-y-1">
                            {row.deliveryHistory.map((delivery) => (
                              <div
                                key={delivery.id}
                                className="rounded-md border bg-muted/20 px-2 py-1 text-[11px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    {formatDateTime(delivery.deliveryDate, {
                                      locale,
                                      timeZone,
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    })}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      delivery.kind === "RETURN"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-green-600 dark:text-green-400",
                                    )}
                                  >
                                    {delivery.kind === "RETURN" ? "-" : ""}
                                    {delivery.deliveredQuantity}
                                  </span>
                                </div>
                                <div className="text-foreground truncate font-medium">
                                  {delivery.deliveryNumber}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {t("history.none")}
                          </span>
                        )
                      }
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
    </section>
  );
}
