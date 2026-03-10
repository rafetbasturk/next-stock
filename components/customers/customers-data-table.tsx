"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  getCoreRowModel,
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
import {
  getCustomerColumns,
} from "@/components/customers/customers-columns";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
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
import { useCustomersSearchNavigation } from "@/hooks/use-customers-search-navigation";
import { useDataTableDefaultRenderers } from "@/hooks/use-data-table-default-renderers";
import { useDataTablePaginationNavigation } from "@/hooks/use-data-table-pagination-navigation";
import { useDataTablePaginationState } from "@/hooks/use-data-table-pagination-state";
import { useDebouncedTableSearchDraft } from "@/hooks/use-debounced-table-search-draft";
import { toClientError } from "@/lib/errors/client-error";
import { useRemoveCustomerMutation } from "@/lib/queries/customers-mutations";
import {
  customerSortFields,
  type CustomersSearch,
} from "@/lib/types/search";
import type { CustomerTableRow } from "@/lib/types/customers";
import { cn } from "@/lib/utils";

type CustomersDataTableProps = {
  data: Array<CustomerTableRow>;
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  search: CustomersSearch;
  enableColumnVisibility?: boolean;
  isLoading?: boolean;
  isRefetching?: boolean;
};

export function CustomersDataTable({
  data,
  total,
  pageIndex,
  pageSize,
  pageCount,
  search,
  enableColumnVisibility = true,
  isLoading = false,
  isRefetching = false,
}: CustomersDataTableProps) {
  const t = useTranslations("CustomersTable");
  const navigate = useCustomersSearchNavigation(search);
  const removeCustomerMutation = useRemoveCustomerMutation();

  const [editingCustomer, setEditingCustomer] =
    useState<CustomerTableRow | null>(null);
  const [deletingCustomer, setDeletingCustomer] =
    useState<CustomerTableRow | null>(null);

  const onEditCustomer = useCallback((customer: CustomerTableRow) => {
    setEditingCustomer(customer);
  }, []);

  const onDeleteCustomer = useCallback((customer: CustomerTableRow) => {
    setDeletingCustomer(customer);
  }, []);

  const confirmDeleteCustomer = useCallback(async () => {
    if (!deletingCustomer || removeCustomerMutation.isPending) return;

    try {
      await removeCustomerMutation.mutateAsync({ id: deletingCustomer.id });
      toast.success(t("delete.toasts.deleteSuccess"));
      setDeletingCustomer(null);
    } catch (error) {
      const clientError = toClientError(error);
      if (clientError.code === "CUSTOMER_HAS_ACTIVE_ORDERS") {
        toast.error(t("delete.toasts.customerHasActiveOrders"));
        return;
      }
      if (clientError.code === "CUSTOMER_NOT_FOUND") {
        toast.error(t("delete.toasts.customerNotFound"));
        setDeletingCustomer(null);
        return;
      }

      toast.error(t("delete.toasts.deleteFailed"));
    }
  }, [deletingCustomer, removeCustomerMutation, t]);

  const columns = useMemo(
    () =>
      getCustomerColumns({
        t,
        onEdit: onEditCustomer,
        onDelete: onDeleteCustomer,
      }),
    [onDeleteCustomer, onEditCustomer, t],
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

  const clearSearchAndNavigate = useClearTableSearch<CustomersSearch>({
    navigate,
    cancelSearchDebounce,
    clearSearchDraft,
  });

  const { onPageSizeChange, onPrev, onNext } =
    useDataTablePaginationNavigation<CustomersSearch>({
      navigate,
      pageIndex,
    });

  const {
    getDesktopHeaderClassName,
    renderDesktopBodyCell,
    getDesktopCellClassName,
  } = useDataTableDefaultRenderers<CustomerTableRow>();

  const hasActiveSearch = Boolean(search.q?.trim());
  const hasActiveSecondaryFilters = false;
  const { showClearAllButton, showFilterChips } = getDataTableFilterVisibility({
    hasSecondaryFilters: false,
    hasActiveSearch,
    hasActiveSecondaryFilters,
  });

  const renderDesktopHeaderCell = useCallback(
    (header: Header<CustomerTableRow, unknown>) => {
      const rawSortKey = header.column.columnDef.meta?.sortKey;
      const { headerAlign, headerJustifyClass, headerLabel } =
        getAlignedHeaderMeta(header);
      const sortKey = customerSortFields.includes(
        rawSortKey as (typeof customerSortFields)[number],
      )
        ? (rawSortKey as CustomersSearch["sortBy"])
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

              {showClearAllButton ? (
                <Button
                  type="button"
                  variant="outline"
                  className={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                  disabled={!hasActiveSearch}
                  onClick={() => {
                    clearSearchAndNavigate(undefined, { replace: true });
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
            showFilterChips && search.q?.trim() ? (
              <DataTableActiveFilterChips
                chips={[search.q.trim()]}
                clearChipLabel={t("filters.clearSearch")}
                getChipKey={(chip) => `q:${chip}`}
                getChipLabel={(chip) => `${t("filters.searchLabel")}: ${chip}`}
                onRemove={() => {
                  clearSearchAndNavigate(undefined, { replace: true });
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
                      key={`customer-mobile-skeleton-${index}`}
                      size="sm"
                      className="gap-3"
                    >
                      <CardHeader className="border-b pb-3">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-2">
                        {Array.from({ length: 3 }).map((__, fieldIndex) => (
                          <div
                            key={`customer-mobile-skeleton-field-${fieldIndex}`}
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
                {data.map((customer) => (
                  <Card key={customer.id} size="sm" className="gap-3">
                    <CardHeader className="border-b pb-3">
                      <CardTitle className="truncate">
                        {customer.code}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {customer.name}
                      </CardDescription>
                      <CardAction>
                        <CustomerCardActionsMenu
                          customer={customer}
                          onEdit={onEditCustomer}
                          onDelete={onDeleteCustomer}
                          editLabel={t("actions.edit")}
                          deleteLabel={t("actions.delete")}
                        />
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2">
                      <DataTableMobileField
                        label={t("columns.email")}
                        value={customer.email?.trim() || "-"}
                      />
                      <DataTableMobileField
                        label={t("columns.phone")}
                        value={customer.phone?.trim() || "-"}
                      />
                      <DataTableMobileField
                        label={t("columns.address")}
                        value={customer.address?.trim() || "-"}
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
              skeletonRowCount={4}
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

      {editingCustomer ? (
        <EditCustomerDialog
          customer={editingCustomer}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingCustomer(null);
            }
          }}
        />
      ) : null}

      <AlertDialog
        open={Boolean(deletingCustomer)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeletingCustomer(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.dialogDescription", {
                code: deletingCustomer?.code ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeCustomerMutation.isPending}>
              {t("delete.buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeCustomerMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteCustomer();
              }}
            >
              {removeCustomerMutation.isPending ? (
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

function CustomerCardActionsMenu({
  customer,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  customer: CustomerTableRow;
  onEdit: (customer: CustomerTableRow) => void;
  onDelete: (customer: CustomerTableRow) => void;
  editLabel: string;
  deleteLabel: string;
}) {
  return (
    <DataTableActionsMenu
      items={[
        {
          key: "edit",
          label: editLabel,
          onSelect: () => onEdit(customer),
          separatorAfter: true,
        },
        {
          key: "delete",
          label: deleteLabel,
          onSelect: () => onDelete(customer),
          destructive: true,
        },
      ]}
    />
  );
}
