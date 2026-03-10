import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";

import { DataTableRowActions } from "@/components/datatable/datatable-row-actions";
import DeliveryKindBadge from "@/components/delivery-kind-badge";
import { Button } from "@/components/ui/button";
import { convertToCurrencyFormat } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import type { DeliveryTableRow } from "@/lib/types/deliveries";
import type { ActionMenuItem } from "@/lib/types/ui";
import { cn } from "@/lib/utils";

export function getDeliveryColumns(
  onEdit: (delivery: DeliveryTableRow) => void,
  onDelete: (id: number) => void,
  t: (key: string) => string,
  locale: string,
  timeZone: string,
): Array<ColumnDef<DeliveryTableRow>> {
  const deliveryActions: Array<ActionMenuItem<DeliveryTableRow>> = [
    {
      label: t("actions.edit"),
      action: (delivery) => onEdit(delivery),
      separatorAfter: true,
    },
    {
      label: t("actions.delete"),
      action: (delivery) => onDelete(delivery.id),
      isDestructive: true,
    },
  ];

  return [
    {
      id: "expand-toggle",
      size: 40,
      enableSorting: false,
      enableHiding: false,
      meta: { headerLabel: "" },
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            row.toggleExpanded();
          }}
          size="icon-sm"
        >
          {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
        </Button>
      ),
    },
    {
      id: "actions",
      size: 40,
      meta: { headerLabel: "" },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <DataTableRowActions row={row} actions={deliveryActions} alignment="start" />
      ),
    },
    {
      accessorKey: "deliveryNumber",
      size: 170,
      meta: {
        sortKey: "delivery_number",
        headerLabel: t("columns.deliveryNumber"),
      },
      cell: ({ row }) => <div className="truncate">{row.original.deliveryNumber}</div>,
      enableHiding: false,
    },
    {
      accessorKey: "deliveryDate",
      size: 180,
      meta: {
        sortKey: "delivery_date",
        headerLabel: t("columns.deliveryDate"),
      },
      cell: ({ row }) => (
        <div className="font-medium truncate">
          {formatDateTime(row.original.deliveryDate, {
            locale,
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </div>
      ),
      enableHiding: false,
    },
    {
      id: "customerName",
      accessorFn: (row) => row.customerName ?? "-",
      size: 240,
      meta: {
        sortKey: "customer",
        headerLabel: t("columns.customer"),
      },
      cell: ({ row }) => (
        <div className="font-medium truncate">{row.original.customerName ?? "-"}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "kind",
      size: 130,
      meta: {
        sortKey: "kind",
        headerAlign: "center",
        headerLabel: t("columns.kind"),
      },
      cell: ({ row }) => {
        const isReturn = row.original.kind === "RETURN";

        return (
          <div className="flex justify-center">
            <DeliveryKindBadge
              kind={row.original.kind}
              label={isReturn ? t("kinds.return") : t("kinds.delivery")}
              className="px-4 md:px-0 md:w-full"
            />
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "totalAmount",
      size: 160,
      meta: {
        headerLabel: t("columns.totalAmount"),
        headerAlign: "right",
      },
      cell: ({ row }) => {
        const isReturn = row.original.kind === "RETURN";
        const amount = convertToCurrencyFormat({
          cents: Math.round(Number(row.original.totalAmount ?? 0)),
          currency: (row.original.currency as "TRY" | "USD" | "EUR") || "TRY",
        });

        return (
          <div className={cn("text-right font-medium", isReturn && "text-red-500")}>
            {amount}
          </div>
        );
      },
      enableHiding: false,
    },
  ];
}
