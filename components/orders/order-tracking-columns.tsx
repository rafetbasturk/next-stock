import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import StatusBadge from "@/components/status-badge";
import { convertToCurrencyFormat } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import type { Currency, OrderStatus } from "@/lib/types/domain";
import type { OrderTrackingTableRow } from "@/lib/types/orders";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";

export function getOrderTrackingStatusLabel(
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

function getCurrencySymbol(currency: Currency | null, locale: string): string {
  if (!currency) return "-";

  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).formatToParts(0);

  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

export function getOrderTrackingColumns(
  t: (key: string) => string,
  locale: string,
  timeZone: string,
): Array<ColumnDef<OrderTrackingTableRow>> {
  return [
    {
      accessorKey: "orderNumber",
      size: 120,
      meta: {
        sortKey: "order_number",
        headerLabel: t("columns.orderNumber"),
      },
      cell: ({ row }) => (
        <div className="truncate font-medium">{row.original.orderNumber}</div>
      ),
    },
    {
      accessorKey: "lineNumber",
      size: 80,
      meta: {
        headerLabel: t("columns.lineNumber"),
        headerAlign: "center",
      },
      cell: ({ row }) => row.original.lineNumber * 10,
    },
    {
      accessorKey: "orderDate",
      size: 120,
      meta: {
        sortKey: "order_date",
        headerLabel: t("columns.orderDate"),
      },
      cell: ({ row }) =>
        formatDateTime(row.original.orderDate, {
          locale,
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
    },
    {
      accessorKey: "materialCode",
      size: 150,
      meta: {
        headerLabel: t("columns.materialCode"),
      },
      cell: ({ row }) => {
        const code = row.original.materialCode?.trim();

        if (!code) {
          return "-";
        }

        if (!row.original.productId) {
          return code;
        }

        return (
          <Link
            href={`/products/${row.original.productId}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {code}
          </Link>
        );
      },
    },
    {
      accessorKey: "materialName",
      size: 250,
      meta: {
        headerLabel: t("columns.materialName"),
      },
      cell: ({ row }) => (
        <div className="truncate">{row.original.materialName}</div>
      ),
    },
    {
      accessorKey: "material",
      size: 140,
      meta: {
        headerLabel: t("columns.material"),
      },
      cell: ({ row }) => (
        <div className="truncate">{row.original.material?.trim() || "-"}</div>
      ),
    },
    {
      accessorKey: "specs",
      size: 160,
      meta: {
        headerLabel: t("columns.specs"),
      },
      cell: ({ row }) => (
        <div className="truncate">{row.original.specs?.trim() || "-"}</div>
      ),
    },
    {
      accessorKey: "specsNet",
      size: 160,
      meta: {
        headerLabel: t("columns.specsNet"),
      },
      cell: ({ row }) => (
        <div className="truncate">{row.original.specsNet?.trim() || "-"}</div>
      ),
    },
    {
      accessorKey: "stockQuantity",
      size: 80,
      meta: {
        sortKey: "stock",
        headerLabel: t("columns.stock"),
        headerAlign: "center",
        className: (_value: unknown, row: OrderTrackingTableRow) =>
          row.hasShortage ? "font-semibold text-red-600 dark:text-red-400" : "",
      },
      cell: ({ row }) => row.original.stockQuantity ?? "-",
    },
    {
      accessorKey: "orderedQuantity",
      size: 100,
      meta: {
        sortKey: "ordered_quantity",
        headerLabel: t("columns.orderedQuantity"),
        headerAlign: "center",
      },
      cell: ({ row }) => row.original.orderedQuantity,
    },
    {
      accessorKey: "deliveredQuantity",
      size: 100,
      meta: {
        sortKey: "delivered_quantity",
        headerLabel: t("columns.deliveredQuantity"),
        headerAlign: "center",
      },
      cell: ({ row }) => row.original.deliveredQuantity,
    },
    {
      accessorKey: "remainingQuantity",
      size: 100,
      meta: {
        sortKey: "remaining_quantity",
        headerLabel: t("columns.remainingQuantity"),
        headerAlign: "center",
        className: (_value: unknown, row: OrderTrackingTableRow) =>
          row.hasShortage ? "font-semibold text-red-600 dark:text-red-400" : "",
      },
      cell: ({ row }) => row.original.remainingQuantity,
    },
    {
      accessorKey: "status",
      size: 150,
      meta: {
        headerLabel: t("columns.status"),
        sortKey: "status",
        headerAlign: "center",
      },
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={getOrderTrackingStatusLabel(row.original.status, t)}
          className="px-4 md:w-full md:px-0"
        />
      ),
    },
    {
      accessorKey: "customerName",
      size: 150,
      meta: {
        sortKey: "customer",
        headerLabel: t("columns.customer"),
      },
      cell: ({ row }) => (
        <div className="truncate">
          {row.original.customerCode?.trim() ||
          row.original.customerName?.trim()
            ? `${row.original.customerCode ?? "-"} - ${row.original.customerName ?? "-"}`
            : "-"}
        </div>
      ),
    },
    {
      accessorKey: "deliveryAddress",
      size: 150,
      meta: {
        headerLabel: t("columns.deliveryAddress"),
      },
      cell: ({ row }) => (
        <div className="truncate">
          {row.original.deliveryAddress?.trim() || "-"}
        </div>
      ),
    },
    {
      accessorKey: "notes",
      size: 180,
      meta: {
        headerLabel: t("columns.notes"),
      },
      cell: ({ row }) => (
        <div className="truncate">{row.original.notes?.trim() || "-"}</div>
      ),
    },
    {
      accessorKey: "unitPrice",
      size: 120,
      meta: {
        sortKey: "unit_price",
        headerLabel: t("columns.unitPrice"),
        headerAlign: "right",
      },
      cell: ({ row }) => (
        <div className="font-medium">
          {convertToCurrencyFormat({
            cents: row.original.unitPrice,
            locale,
            style: "decimal",
          })}
        </div>
      ),
    },
    {
      accessorKey: "currency",
      size: 100,
      meta: {
        headerLabel: t("columns.currency"),
        headerAlign: "center",
      },
      cell: ({ row }) => getCurrencySymbol(row.original.currency, locale),
    },
    {
      accessorKey: "unit",
      size: 100,
      meta: {
        headerLabel: t("columns.unit"),
        headerAlign: "center",
      },
      cell: ({ row }) => row.original.unit ?? "-",
    },
    {
      accessorKey: "deliveryHistory",
      size: 300,
      meta: {
        headerLabel: t("columns.deliveryHistory"),
      },
      cell: ({ row }) =>
        row.original.deliveryHistory.length > 0 ? (
          <div className="space-y-1 py-1 w-fit">
            {row.original.deliveryHistory.map((delivery) => (
              <div
                key={delivery.id}
                className="flex gap-2 rounded-md border bg-muted/20 px-2 py-1 text-[11px]"
              >
                <div className="text-muted-foreground shrink-0">
                  {formatDateTime(delivery.deliveryDate, {
                    locale,
                    timeZone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </div>
                <Separator orientation="vertical" />
                <div className="text-foreground truncate font-medium">
                  {delivery.deliveryNumber}
                </div>
                <Separator orientation="vertical" />

                <div
                  className={cn(
                    "shrink-0 font-semibold",
                    delivery.kind === "RETURN"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {delivery.kind === "RETURN" ? "-" : ""}
                  {delivery.deliveredQuantity} {row.original.unit}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">
            {t("history.none")}
          </span>
        ),
    },
  ];
}
