import type { ColumnDef } from "@tanstack/react-table";

import { DataTableRowActions } from "@/components/datatable/datatable-row-actions";
import StatusBadge from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { convertToCurrencyFormat } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import type { OrderStatus } from "@/lib/types/domain";
import type { OrderTableRow } from "@/lib/types/orders";
import type { ActionMenuItem } from "@/lib/types/ui";
import { ChevronDown, ChevronRight } from "lucide-react";

function getStatusLabel(
  status: OrderStatus | string,
  t: (key: string) => string,
): string {
  switch (status) {
    case "KAYIT":
      return t("status.KAYIT");
    case "ÜRETİM":
      return t("status.ÜRETİM");
    case "KISMEN HAZIR":
      return t("status.KISMEN_HAZIR");
    case "HAZIR":
      return t("status.HAZIR");
    case "BİTTİ":
      return t("status.BİTTİ");
    case "İPTAL":
      return t("status.İPTAL");
    default:
      return status;
  }
}

export const getOrderColumns = (
  onEdit: (order: OrderTableRow) => void,
  onDelete: (id: number) => void,
  t: (key: string) => string,
  locale: string,
  timeZone: string,
): Array<ColumnDef<OrderTableRow>> => {
  const orderActions: Array<ActionMenuItem<OrderTableRow>> = [
    {
      label: t("actions.edit"),
      action: (order) => onEdit(order),
      separatorAfter: true,
    },
    {
      label: t("actions.delete"),
      action: (order) => onDelete(order.id),
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
        <DataTableRowActions row={row} actions={orderActions} alignment="start" />
      ),
    },
    {
      accessorKey: "orderNumber",
      size: 160,
      meta: {
        sortKey: "order_number",
        headerLabel: t("columns.orderNumber"),
      },
      cell: ({ row }) => (
        <div className="truncate">
          {String(row.getValue("orderNumber") ?? "")}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "orderDate",
      size: 180,
      meta: {
        sortKey: "order_date",
        headerLabel: t("columns.orderDate"),
      },
      cell: ({ row }) => (
        <div className="font-medium truncate">
          {formatDateTime(row.getValue("orderDate"), {
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
      size: 220,
      meta: {
        sortKey: "customer",
        headerLabel: t("columns.customer"),
      },
      cell: ({ row }) => (
        <div className="font-medium truncate">
          {row.original.customerName ?? "-"}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "deliveryAddress",
      size: 240,
      meta: {
        headerLabel: t("columns.deliveryAddress"),
      },
      cell: ({ row }) => (
        <div className="font-medium truncate">
          {row.original.deliveryAddress ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      size: 120,
      meta: {
        sortKey: "status",
        headerAlign: "center",
        headerLabel: t("columns.status"),
      },
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <StatusBadge
            status={status}
            label={getStatusLabel(status, t)}
            className="px-4 md:px-0 md:w-full"
          />
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "totalAmount",
      size: 140,
      meta: {
        headerLabel: t("columns.totalAmount"),
        headerAlign: "right",
      },
      cell: ({ row }) => {
        const formatted = convertToCurrencyFormat({
          cents: row.original.totalAmount,
          currency: (row.original.currency as "TRY" | "USD" | "EUR") || "TRY",
          style: "currency",
        });

        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
  ];
};
