import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { StockMovementTableRow } from "@/lib/server/stock";

export type MovementTableRow = StockMovementTableRow;

type MovementColumnsOptions = {
  t: (key: string) => string;
  formatDate: (value: string) => string;
};

function toReferenceLabel(row: MovementTableRow) {
  if (!row.referenceType || !row.referenceId) return "-";
  return `${row.referenceType} #${row.referenceId}`;
}

function movementBadgeVariant(
  type: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (type === "OUT" || type === "DELIVERY") return "destructive";
  if (type === "ADJUSTMENT" || type === "TRANSFER") return "outline";
  if (type === "RETURN") return "secondary";
  return "default";
}

export function getMovementColumns({
  t,
  formatDate,
}: MovementColumnsOptions): Array<ColumnDef<MovementTableRow>> {
  return [
    {
      accessorKey: "product",
      size: 280,
      meta: { headerLabel: t("columns.product") },
      cell: ({ row }) => {
        const productCode = row.original.productCode?.trim();
        const productName = row.original.productName?.trim();

        return (
          <div className="min-w-0">
            <div className="font-medium truncate">{productCode || "-"}</div>
            <div className="text-muted-foreground text-xs truncate">
              {productName || "-"}
            </div>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "quantity",
      size: 120,
      meta: {
        headerLabel: t("columns.quantity"),
        headerAlign: "center",
      },
      cell: ({ row }) => {
        const quantity = row.original.quantity;
        const sign = quantity > 0 ? "+" : "";

        return (
          <div className="text-center font-semibold tabular-nums">
            {sign}
            {quantity}
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "movementType",
      size: 140,
      meta: {
        headerLabel: t("columns.movementType"),
        headerAlign: "center",
      },
      cell: ({ row }) => {
        const type = row.original.movementType;
        return (
          <Badge variant={movementBadgeVariant(type)} className="w-full">
            {t(`movementTypes.${type}`)}
          </Badge>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "createdAt",
      size: 170,
      meta: { headerLabel: t("columns.createdAt") },
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground text-sm">
            {formatDate(row.original.createdAt)}
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "createdBy",
      size: 160,
      meta: { headerLabel: t("columns.createdBy") },
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground truncate">
            {row.original.createdByUsername || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "reference",
      size: 180,
      meta: { headerLabel: t("columns.reference") },
      cell: ({ row }) => {
        const reference = toReferenceLabel(row.original);
        return (
          <div className="text-muted-foreground truncate">{reference}</div>
        );
      },
    },
    {
      accessorKey: "notes",
      size: 320,
      meta: { headerLabel: t("columns.notes") },
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground truncate">
            {row.original.notes?.trim() || "-"}
          </div>
        );
      },
    },
  ];
}
