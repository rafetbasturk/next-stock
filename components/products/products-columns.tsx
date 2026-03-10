import type { ColumnDef } from "@tanstack/react-table";

import { DataTableRowActions } from "@/components/datatable/datatable-row-actions";
import { convertToCurrencyFormat } from "@/lib/currency";
import type { ProductTableRow } from "@/lib/types/products";
import type { ActionMenuItem } from "@/lib/types/ui";
import { Badge } from "../ui/badge";

type ProductActionHandlers = {
  onEdit: (product: ProductTableRow) => void;
  onAdjustStock: (product: ProductTableRow) => void;
  onDelete: (product: ProductTableRow) => void;
  t: (key: string) => string;
};

export const getProductColumns = ({
  onEdit,
  onAdjustStock,
  onDelete,
  t,
}: ProductActionHandlers): Array<ColumnDef<ProductTableRow>> => {
  const rowActions: Array<ActionMenuItem<ProductTableRow>> = [
    {
      label: t("actions.edit"),
      action: (product) => onEdit(product),
    },
    {
      label: t("actions.adjustStock"),
      action: (product) => onAdjustStock(product),
      separatorAfter: true,
    },
    {
      label: t("actions.delete"),
      action: (product) => onDelete(product),
      isDestructive: true,
    },
  ];

  return [
    {
      id: "actions",
      meta: { headerLabel: "" },
      size: 40,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <DataTableRowActions row={row} actions={rowActions} />,
    },
    {
      accessorKey: "code",
      size: 150,
      meta: { sortKey: "code", headerLabel: t("columns.code") },
      cell: ({ row }) => (
        <div className="font-medium truncate">{row.original.code}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "name",
      size: 320,
      meta: { sortKey: "name", headerLabel: t("columns.name") },
      cell: ({ row }) => <div className="truncate">{row.original.name}</div>,
      enableHiding: false,
    },
    {
      accessorKey: "stock_quantity",
      size: 100,
      meta: { headerLabel: t("columns.quantity"), headerAlign: "center" },
      cell: ({ row }) => {
        const product = row.original;
        const isLow = product.stockQuantity <= (product.minStockLevel || 0);
        return (
          <div className="font-bold md:text-center">
            <Badge
              variant={isLow ? "destructive" : "default"}
              className="w-full"
            >
              {product.stockQuantity} {product.unit}
            </Badge>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "price",
      size: 120,
      meta: {
        sortKey: "price",
        headerLabel: t("columns.price"),
        headerAlign: "right",
        headerClassName: "p-0",
      },
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const formatted = convertToCurrencyFormat({
          cents: row.original.price ?? 0,
          currency: row.original.currency,
          style: "currency",
        });

        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "customer",
      meta: { sortKey: "customer", headerLabel: t("columns.customer") },
      size: 150,
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground truncate">
            {row.original.customerName}
          </div>
        );
      },
    },
    {
      accessorKey: "other_codes",
      meta: { headerLabel: t("columns.otherCodes") },
      size: 180,
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {row.original.otherCodes}
        </div>
      ),
    },
    {
      accessorKey: "material",
      meta: { sortKey: "material", headerLabel: t("columns.material") },
      size: 160,
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {row.original.material}
        </div>
      ),
    },
    {
      accessorKey: "post_process",
      meta: { headerLabel: t("columns.postProcess") },
      size: 170,
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {row.original.postProcess}
        </div>
      ),
    },
    {
      accessorKey: "coating",
      meta: { headerLabel: t("columns.coating") },
      size: 150,
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {row.original.coating}
        </div>
      ),
    },
    {
      accessorKey: "specs",
      meta: { headerLabel: t("columns.specifications") },
      size: 150,
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {row.original.specs}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "specsNet",
      meta: { headerLabel: t("columns.netSpecs") },
      size: 150,
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {row.original.specsNet}
        </div>
      ),
    },
    {
      accessorKey: "notes",
      meta: { headerLabel: t("columns.notes") },
      size: 260,
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {row.original.notes}
        </div>
      ),
    },
  ];
};
