"use client";

import { CheckCircle, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/datetime";
import { useOrderHistory } from "@/lib/queries/order-history";
import { getClientTimeZone } from "@/lib/timezone-client";
import { cn } from "@/lib/utils";

type OrderProductHistoryTableProps = {
  orderId: number;
};

export function OrderProductHistoryTable({
  orderId,
}: OrderProductHistoryTableProps) {
  const t = useTranslations("OrdersTable.history");
  const locale = useLocale();
  const timeZone = getClientTimeZone();
  const { data, isPending, isError } = useOrderHistory(orderId, true);

  if (isPending) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-muted-foreground p-3 text-sm">{t("loadFailed")}</div>
    );
  }

  const preparedItems = (data?.items ?? []).map((item) => {
    const pastDeliveries = item.deliveries;
    const signedQty = (delivery: (typeof item.deliveries)[number]) =>
      delivery.kind === "RETURN"
        ? -delivery.deliveredQuantity
        : delivery.deliveredQuantity;

    const delivered = pastDeliveries.reduce(
      (sum, delivery) => sum + signedQty(delivery),
      0,
    );
    const remaining = item.quantity - delivered;
    const progress =
      item.quantity > 0
        ? Math.max(0, Math.min((delivered / item.quantity) * 100, 100))
        : 0;

    return {
      id: `${item.itemType}-${item.id}`,
      productCode: item.productCode,
      productName: item.productName,
      qty: item.quantity,
      delivered,
      remaining,
      progress,
      pastDeliveries,
      signedQty,
    };
  });

  return (
    <div
      className={cn(
        "overflow-hidden shadow-inner",
        "bg-background",
        "animate-accordion-down transition-all duration-300",
      )}
    >
      <h3 className="text-foreground px-2 pt-4 text-base font-semibold">
        {t("title")}
      </h3>

      <div className="m-2 hidden max-h-112 overflow-x-auto overflow-y-auto rounded border animate-in delay-100 duration-300 md:block">
        <Table className="w-full table-auto border">
          <TableHeader>
            <TableRow className="bg-muted text-muted-foreground text-xs capitalize">
              <TableHead className="min-w-35">{t("columns.status")}</TableHead>
              <TableHead className="min-w-45">{t("columns.product")}</TableHead>
              <TableHead className="min-w-17.5 text-center">
                {t("columns.ordered")}
              </TableHead>
              <TableHead className="min-w-22.5 text-center">
                {t("columns.delivered")}
              </TableHead>
              <TableHead className="min-w-22.5 text-center">
                {t("columns.remaining")}
              </TableHead>
              <TableHead className="min-w-65">
                {t("columns.shipmentHistory")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {preparedItems.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  "border-border text-sm transition-colors hover:bg-accent/90",
                  item.remaining <= 0 && "bg-green-500/5 dark:bg-green-400/10",
                )}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-green-700 dark:text-green-400">
                        %{item.progress.toFixed(0)}
                      </span>

                      <span
                        className={cn(
                          "flex items-center gap-1 font-medium",
                          item.remaining > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.remaining > 0 ? (
                          <>
                            <Clock className="h-3 w-3" />
                            {t("status.missing", {
                              count: item.remaining,
                            })}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                            {t("status.completed")}
                          </>
                        )}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded bg-muted">
                      <div
                        className={cn(
                          "h-full rounded transition-all",
                          item.remaining > 0
                            ? "bg-green-600 dark:bg-green-500"
                            : "bg-green-500 dark:bg-green-400",
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-foreground font-medium">
                    {item.productCode}
                  </div>
                  {item.productName ? (
                    <div className="text-muted-foreground text-xs">
                      {item.productName}
                    </div>
                  ) : null}
                </TableCell>

                <TableCell className="text-foreground text-center">
                  {item.qty}
                </TableCell>

                <TableCell
                  className={cn(
                    "text-center font-semibold",
                    item.delivered < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400",
                  )}
                >
                  {item.delivered}
                </TableCell>

                <TableCell
                  className={cn(
                    "text-center font-medium",
                    item.remaining > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                  )}
                >
                  {item.remaining}
                </TableCell>

                <TableCell>
                  {item.pastDeliveries.length > 0 ? (
                    <div className="space-y-1">
                      {item.pastDeliveries.map((delivery) => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1 text-[11px]"
                        >
                          <div className="min-w-0">
                            <p className="text-muted-foreground">
                              {formatDateTime(delivery.deliveryDate, {
                                locale,
                                timeZone,
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </p>
                            <p className="text-foreground truncate">
                              {delivery.deliveryNumber}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "shrink-0 font-semibold",
                              item.signedQty(delivery) < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400",
                            )}
                          >
                            {delivery.kind === "RETURN" ? "+" : "-"}
                            {delivery.deliveredQuantity} {t("qtySuffix")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {t("none")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!preparedItems.length ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="m-2 space-y-3 md:hidden">
        {preparedItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "bg-background space-y-3 rounded-lg border p-3",
              item.remaining <= 0 && "bg-green-500/5 dark:bg-green-400/10",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-foreground text-sm font-medium">
                  {item.productCode}
                </p>
                {item.productName ? (
                  <p className="text-muted-foreground text-xs">
                    {item.productName}
                  </p>
                ) : null}
              </div>

              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  item.remaining > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400",
                )}
              >
                {item.remaining > 0 ? (
                  <>
                    <Clock className="h-3 w-3" />
                    {t("status.missing", {
                      count: item.remaining,
                    })}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    {t("status.completed")}
                  </>
                )}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("columns.progress")}
                </span>
                <span className="font-medium text-green-700 dark:text-green-400">
                  %{item.progress.toFixed(0)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-muted">
                <div
                  className={cn(
                    "h-full rounded transition-all",
                    item.remaining > 0
                      ? "bg-green-600 dark:bg-green-500"
                      : "bg-green-500 dark:bg-green-400",
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border bg-muted/20 py-1.5">
                <p className="text-muted-foreground text-[11px]">
                  {t("columns.ordered")}
                </p>
                <p className="text-foreground text-sm font-semibold">
                  {item.qty}
                </p>
              </div>
              <div className="rounded-md border bg-muted/20 py-1.5">
                <p className="text-muted-foreground text-[11px]">
                  {t("columns.delivered")}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    item.delivered < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400",
                  )}
                >
                  {item.delivered}
                </p>
              </div>
              <div className="rounded-md border bg-muted/20 py-1.5">
                <p className="text-muted-foreground text-[11px]">
                  {t("columns.remaining")}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    item.remaining > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                  )}
                >
                  {item.remaining}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">
                {t("columns.shipmentHistory")}
              </p>
              {item.pastDeliveries.length > 0 ? (
                <div className="space-y-1.5">
                  {item.pastDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="text-muted-foreground">
                          {formatDateTime(delivery.deliveryDate, {
                            locale,
                            timeZone,
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </p>
                        <p className="text-foreground truncate">
                          {delivery.deliveryNumber}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "shrink-0 font-semibold",
                          item.signedQty(delivery) < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400",
                        )}
                      >
                        {item.signedQty(delivery) > 0 ? "+" : ""}
                        {item.signedQty(delivery)} {t("qtySuffix")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">{t("none")}</p>
              )}
            </div>
          </div>
        ))}

        {!preparedItems.length ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {t("empty")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
