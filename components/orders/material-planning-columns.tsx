import type { ColumnDef } from "@tanstack/react-table";

import { DataTableActionsMenu } from "@/components/datatable/data-table-actions-menu";
import type { MaterialPlanningTableRow } from "@/lib/types/orders";

export function getMaterialPlanningColumns(
  t: (key: string) => string,
  options?: {
    onEditProduct?: (productId: number) => void;
    editingProductId?: number | null;
    isEditLoading?: boolean;
  },
): Array<ColumnDef<MaterialPlanningTableRow>> {
  return [
    {
      accessorKey: "productCode",
      size: 150,
      meta: {
        sortKey: "product_code",
        headerLabel: t("columns.productCode"),
      },
      cell: ({ row }) => (
        <div className="truncate font-medium">{row.original.productCode}</div>
      ),
    },
    {
      accessorKey: "productName",
      size: 260,
      meta: {
        sortKey: "product_name",
        headerLabel: t("columns.productName"),
      },
      cell: ({ row }) => (
        <div className="truncate">{row.original.productName}</div>
      ),
    },
    {
      accessorKey: "openOrderQuantity",
      size: 120,
      meta: {
        sortKey: "open_order_quantity",
        headerLabel: t("columns.openOrderQuantity"),
        headerAlign: "center",
      },
      cell: ({ row }) => row.original.openOrderQuantity,
    },
    {
      accessorKey: "stockQuantity",
      size: 100,
      meta: {
        sortKey: "stock",
        headerLabel: t("columns.stock"),
        headerAlign: "center",
      },
      cell: ({ row }) => row.original.stockQuantity,
    },
    {
      accessorKey: "purchaseQuantity",
      size: 120,
      meta: {
        sortKey: "purchase_quantity",
        headerLabel: t("columns.purchaseQuantity"),
        headerAlign: "center",
        className: "font-semibold text-red-600 dark:text-red-400",
      },
      cell: ({ row }) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          {row.original.purchaseQuantity}
        </span>
      ),
    },
    {
      accessorKey: "material",
      size: 140,
      meta: {
        sortKey: "material",
        headerLabel: t("columns.material"),
      },
      cell: ({ row }) => row.original.material?.trim() || "-",
    },
    {
      accessorKey: "specs",
      size: 180,
      meta: {
        sortKey: "specs",
        headerLabel: t("columns.specs"),
      },
      cell: ({ row }) => row.original.specs?.trim() || "-",
    },
    {
      id: "actions",
      size: 72,
      enableHiding: false,
      meta: {
        headerLabel: t("columns.actions"),
        headerAlign: "center",
      },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <DataTableActionsMenu
            srLabel={t("actions.openMenu")}
            items={[
              {
                key: "edit-product",
                label:
                  options?.isEditLoading &&
                  options.editingProductId === row.original.productId
                    ? t("actions.loadingProduct")
                    : t("actions.editProduct"),
                disabled:
                  options?.isEditLoading &&
                  options.editingProductId === row.original.productId,
                onSelect: () => options?.onEditProduct?.(row.original.productId),
              },
            ]}
          />
        </div>
      ),
    },
  ];
}
