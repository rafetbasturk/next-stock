"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
} from "@tanstack/react-table";

import {
  type MovementTableRow,
  getMovementColumns,
} from "@/components/movements/movements-columns";
import { AdjustProductStockDialog } from "@/components/products/adjust-product-stock-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableActiveFilterChips } from "@/components/datatable/data-table-active-filter-chips";
import { DataTableActionsMenu } from "@/components/datatable/data-table-actions-menu";
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
import { useMovementsSearchNavigation } from "@/hooks/use-movements-search-navigation";
import { useDebouncedTableSearchDraft } from "@/hooks/use-debounced-table-search-draft";
import { useClearTableSearch } from "@/hooks/use-clear-table-search";
import { useDataTableDefaultRenderers } from "@/hooks/use-data-table-default-renderers";
import { useDataTablePaginationNavigation } from "@/hooks/use-data-table-pagination-navigation";
import { useDataTablePaginationState } from "@/hooks/use-data-table-pagination-state";
import { usePersistedColumnVisibility } from "@/hooks/use-persisted-column-visibility";
import { formatDateTime } from "@/lib/datetime";
import { toClientError } from "@/lib/errors/client-error";
import { useRemoveMovementMutation } from "@/lib/queries/movements-mutations";
import { getClientTimeZone } from "@/lib/timezone-client";
import { stockMovementTypes, type StockSearch } from "@/lib/types/search";
import { cn } from "@/lib/utils";

type MovementsDataTableProps = {
  data: Array<MovementTableRow>;
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  search: StockSearch;
  enableColumnVisibility?: boolean;
  isLoading?: boolean;
  isRefetching?: boolean;
};

export function MovementsDataTable({
  data,
  total,
  pageIndex,
  pageSize,
  pageCount,
  search,
  enableColumnVisibility = true,
  isLoading = false,
  isRefetching = false,
}: MovementsDataTableProps) {
  const t = useTranslations("MovementsTable");
  const navigate = useMovementsSearchNavigation(search);
  const locale = useLocale();
  const timeZone = useMemo(() => getClientTimeZone(), []);

  const [columnVisibility, setColumnVisibility] = usePersistedColumnVisibility({
    storageKey: "movements:columnVisibility:v1",
    initialVisibility: {
      createdBy: false,
    },
  });
  const [detailsMovement, setDetailsMovement] =
    useState<MovementTableRow | null>(null);
  const [editingMovement, setEditingMovement] = useState<MovementTableRow | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<MovementTableRow | null>(null);
  const removeMovementMutation = useRemoveMovementMutation();

  const formatMovementDate = useCallback(
    (value: string) =>
      formatDateTime(value, {
        locale,
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale, timeZone],
  );

  const openDetails = useCallback((movement: MovementTableRow) => {
    setDetailsMovement(movement);
  }, []);
  const openEdit = useCallback((movement: MovementTableRow) => {
    setEditingMovement(movement);
  }, []);
  const openDelete = useCallback((movement: MovementTableRow) => {
    setDeletingMovement(movement);
  }, []);
  const confirmDelete = useCallback(async () => {
    if (!deletingMovement || removeMovementMutation.isPending) return;

    try {
      await removeMovementMutation.mutateAsync({ id: deletingMovement.id });
      toast.success(t("delete.toasts.success"));
      setDeletingMovement(null);
    } catch (error) {
      const clientError = toClientError(error);
      if (clientError.code === "MOVEMENT_NOT_FOUND") {
        toast.error(t("delete.toasts.notFound"));
        setDeletingMovement(null);
        return;
      }
      if (clientError.code === "MOVEMENT_NOT_REMOVABLE") {
        toast.error(t("delete.toasts.notRemovable"));
        return;
      }
      if (clientError.code === "INSUFFICIENT_STOCK") {
        toast.error(t("delete.toasts.insufficientStock"));
        return;
      }

      toast.error(t("delete.toasts.failed"));
    }
  }, [deletingMovement, removeMovementMutation, t]);

  const columns = useMemo(() => {
    const actionColumn: ColumnDef<MovementTableRow> = {
      id: "actions",
      size: 44,
      meta: { headerLabel: "" },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <MovementRowActionsMenu
          movement={row.original}
          editLabel={t("actions.edit")}
          deleteLabel={t("actions.delete")}
          viewDetailsLabel={t("actions.viewDetails")}
          goToProductLabel={t("actions.goToProduct")}
          goToReferenceLabel={t("actions.goToReference")}
          onEdit={openEdit}
          onDelete={openDelete}
          onViewDetails={openDetails}
        />
      ),
    };

    return [
      actionColumn,
      ...getMovementColumns({
        t,
        formatDate: formatMovementDate,
      }),
    ];
  }, [formatMovementDate, openDelete, openDetails, openEdit, t]);

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
  const clearSearchAndNavigate = useClearTableSearch<StockSearch>({
    navigate,
    cancelSearchDebounce,
    clearSearchDraft,
  });
  const { onPageSizeChange, onPrev, onNext } =
    useDataTablePaginationNavigation<StockSearch>({
      navigate,
      pageIndex,
    });

  const movementTypeOptions = useMemo(
    () =>
      stockMovementTypes.map((type) => ({
        value: type,
        label: t(`movementTypes.${type}`),
      })),
    [t],
  );

  const selectedMovementType: string = search.movementType ?? "ALL";
  const selectedMovementTypeLabel =
    selectedMovementType === "ALL"
      ? t("filters.allTypes")
      : movementTypeOptions.find((option) => option.value === selectedMovementType)
          ?.label ?? selectedMovementType;

  const activeFilterChips = useMemo(() => {
    const chips: Array<{
      type: "movementType" | "productId";
      value: string;
      label: string;
    }> = [];

    if (search.movementType) {
      chips.push({
        type: "movementType",
        value: search.movementType,
        label: `${t("filters.movementType")}: ${t(
          `movementTypes.${search.movementType}`,
        )}`,
      });
    }

    if (typeof search.productId === "number" && search.productId > 0) {
      chips.push({
        type: "productId",
        value: String(search.productId),
        label: `${t("filters.productId")}: ${search.productId}`,
      });
    }

    return chips;
  }, [search.movementType, search.productId, t]);

  const hasActiveSearch = Boolean(search.q?.trim());
  const hasSecondaryFilters = movementTypeOptions.length > 0;
  const hasActiveSecondaryFilters = Boolean(
    search.movementType || search.productId,
  );
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
  } = useDataTableDefaultRenderers<MovementTableRow>();

  const { fromRow, toRow, hasPrev, hasNext, pageSizeOptions } =
    useDataTablePaginationState({
      total,
      pageIndex,
      pageSize,
      pageCount,
    });

  const renderDesktopHeaderCell = useCallback(
    (header: Header<MovementTableRow, unknown>) => {
      const { headerJustifyClass, headerLabel } = getAlignedHeaderMeta(header);

      return (
        <div className={cn("flex items-center", headerJustifyClass)}>
          {headerLabel}
        </div>
      );
    },
    [],
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

            <Select
              value={selectedMovementType}
              onValueChange={(value) => {
                const nextValue = value ?? "ALL";
                navigate({
                  movementType:
                    nextValue === "ALL"
                      ? undefined
                      : (nextValue as (typeof stockMovementTypes)[number]),
                  pageIndex: 0,
                });
              }}
            >
              <SelectTrigger
                className={cn("w-44", DATA_TABLE_FILTER_TRIGGER_CLASSNAME)}
              >
                <SelectValue placeholder={t("filters.movementType")}>
                  {selectedMovementTypeLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectItem value="ALL">{t("filters.allTypes")}</SelectItem>
                {movementTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showClearAllButton ? (
              <Button
                type="button"
                variant="outline"
                className={DATA_TABLE_FILTER_TRIGGER_CLASSNAME}
                disabled={!hasAnyActiveFilters}
                onClick={() => {
                  clearSearchAndNavigate(
                    {
                      movementType: undefined,
                      productId: undefined,
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
                if (chip.type === "movementType") {
                  navigate(
                    {
                      movementType: undefined,
                      pageIndex: 0,
                    },
                    { replace: true },
                  );
                  return;
                }

                navigate(
                  {
                    productId: undefined,
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
                    key={`movement-mobile-skeleton-${index}`}
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
                          key={`movement-mobile-skeleton-field-${fieldIndex}`}
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
              {data.map((movement) => {
                const quantitySign = movement.quantity > 0 ? "+" : "";
                const reference =
                  movement.referenceType && movement.referenceId
                    ? `${movement.referenceType} #${movement.referenceId}`
                    : "-";

                return (
                  <Card key={movement.id} size="sm" className="gap-3">
                    <CardHeader className="border-b pb-3">
                      <CardTitle className="truncate">
                        {movement.productCode || "-"}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {movement.productName || "-"}
                      </CardDescription>
                      <CardAction>
                        <MovementRowActionsMenu
                          movement={movement}
                          editLabel={t("actions.edit")}
                          deleteLabel={t("actions.delete")}
                          viewDetailsLabel={t("actions.viewDetails")}
                          goToProductLabel={t("actions.goToProduct")}
                          goToReferenceLabel={t("actions.goToReference")}
                          onEdit={openEdit}
                          onDelete={openDelete}
                          onViewDetails={openDetails}
                        />
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2">
                      <DataTableMobileField
                        label={t("columns.createdAt")}
                        value={formatMovementDate(movement.createdAt)}
                      />
                      <DataTableMobileField
                        label={t("columns.movementType")}
                        value={
                          <Badge
                            variant={
                              movement.movementType === "OUT" ||
                              movement.movementType === "DELIVERY"
                                ? "destructive"
                                : movement.movementType === "ADJUSTMENT" ||
                                    movement.movementType === "TRANSFER"
                                  ? "outline"
                                  : movement.movementType === "RETURN"
                                    ? "secondary"
                                    : "default"
                            }
                          >
                            {t(`movementTypes.${movement.movementType}`)}
                          </Badge>
                        }
                      />
                      <DataTableMobileField
                        label={t("columns.quantity")}
                        value={`${quantitySign}${movement.quantity}`}
                      />
                      <DataTableMobileField
                        label={t("columns.reference")}
                        value={reference}
                      />
                      <DataTableMobileField
                        label={t("columns.createdBy")}
                        value={movement.createdByUsername || "-"}
                      />
                      <DataTableMobileField
                        label={t("columns.notes")}
                        value={movement.notes?.trim() || "-"}
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

      {editingMovement ? (
        <AdjustProductStockDialog
          movement={editingMovement}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingMovement(null);
            }
          }}
        />
      ) : null}

      <AlertDialog
        open={Boolean(deletingMovement)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeletingMovement(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.dialogDescription", { id: deletingMovement?.id ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMovementMutation.isPending}>
              {t("delete.buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMovementMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {t("delete.buttons.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(detailsMovement)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDetailsMovement(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("details.dialogTitle", { id: detailsMovement?.id ?? 0 })}
            </DialogTitle>
            <DialogDescription>
              {t("details.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          {detailsMovement ? (
            <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
              <p className="text-muted-foreground">{t("details.fields.id")}</p>
              <p className="font-medium">{detailsMovement.id}</p>

              <p className="text-muted-foreground">
                {t("details.fields.product")}
              </p>
              <p className="font-medium">
                {detailsMovement.productCode || "-"} -{" "}
                {detailsMovement.productName || "-"}
              </p>

              <p className="text-muted-foreground">
                {t("details.fields.movementType")}
              </p>
              <p className="font-medium">
                {t(`movementTypes.${detailsMovement.movementType}`)}
              </p>

              <p className="text-muted-foreground">
                {t("details.fields.quantity")}
              </p>
              <p className="font-medium">{detailsMovement.quantity}</p>

              <p className="text-muted-foreground">
                {t("details.fields.reference")}
              </p>
              <p className="font-medium">{toReferenceLabel(detailsMovement)}</p>

              <p className="text-muted-foreground">
                {t("details.fields.createdBy")}
              </p>
              <p className="font-medium">
                {detailsMovement.createdByUsername || "-"}
              </p>

              <p className="text-muted-foreground">
                {t("details.fields.createdAt")}
              </p>
              <p className="font-medium">
                {formatMovementDate(detailsMovement.createdAt)}
              </p>

              <p className="text-muted-foreground">
                {t("details.fields.notes")}
              </p>
              <p className="font-medium">
                {detailsMovement.notes?.trim() || "-"}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function buildProductHref(movement: MovementTableRow) {
  return `/products/${movement.productId}`;
}

function buildReferenceHref(movement: MovementTableRow): string | null {
  if (!movement.referenceType || !movement.referenceId) return null;

  if (movement.referenceType === "order") {
    return `/orders?q=${movement.referenceId}`;
  }

  if (movement.referenceType === "delivery") {
    return `/deliveries?q=${movement.referenceId}`;
  }

  return null;
}

function toReferenceLabel(movement: MovementTableRow): string {
  if (!movement.referenceType || !movement.referenceId) return "-";
  return `${movement.referenceType} #${movement.referenceId}`;
}

function isEditableMovementType(type: string): boolean {
  return type === "IN" || type === "OUT" || type === "ADJUSTMENT";
}

function isRemovableMovementType(type: string): boolean {
  return type === "IN" || type === "OUT" || type === "ADJUSTMENT" || type === "TRANSFER";
}

function MovementRowActionsMenu({
  movement,
  editLabel,
  deleteLabel,
  viewDetailsLabel,
  goToProductLabel,
  goToReferenceLabel,
  onEdit,
  onDelete,
  onViewDetails,
}: {
  movement: MovementTableRow;
  editLabel: string;
  deleteLabel: string;
  viewDetailsLabel: string;
  goToProductLabel: string;
  goToReferenceLabel: string;
  onEdit: (movement: MovementTableRow) => void;
  onDelete: (movement: MovementTableRow) => void;
  onViewDetails: (movement: MovementTableRow) => void;
}) {
  const productHref = buildProductHref(movement);
  const referenceHref = buildReferenceHref(movement);
  const editable = isEditableMovementType(movement.movementType);
  const removable = isRemovableMovementType(movement.movementType);

  return (
    <DataTableActionsMenu
      items={[
        {
          key: "edit",
          label: editLabel,
          onSelect: () => onEdit(movement),
          disabled: !editable,
        },
        {
          key: "view-details",
          label: viewDetailsLabel,
          onSelect: () => onViewDetails(movement),
          separatorAfter: true,
        },
        {
          key: "go-product",
          label: goToProductLabel,
          render: <Link href={productHref} />,
        },
        {
          key: "go-reference",
          label: goToReferenceLabel,
          render: referenceHref ? <Link href={referenceHref} /> : undefined,
          disabled: !referenceHref,
          separatorAfter: true,
        },
        {
          key: "delete",
          label: deleteLabel,
          onSelect: () => onDelete(movement),
          disabled: !removable,
          destructive: true,
        },
      ]}
      stopPropagation
    />
  );
}
