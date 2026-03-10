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
import { useDeliveryHistory } from "@/lib/queries/delivery-history";
import { getClientTimeZone } from "@/lib/timezone-client";
import { cn } from "@/lib/utils";

type DeliveryProductsHistoryTableProps = {
  deliveryId: number;
};

export function DeliveryProductsHistoryTable({
  deliveryId,
}: DeliveryProductsHistoryTableProps) {
  const t = useTranslations("DeliveriesTable.history");
  const locale = useLocale();
  const timeZone = getClientTimeZone();
  const { data, isPending, isError } = useDeliveryHistory(deliveryId, true);

  if (isPending) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-muted-foreground p-3 text-sm">{t("loadFailed")}</div>;
  }

  const isReturn = data?.kind === "RETURN";

  const preparedItems = (data?.items ?? []).map((item, index) => {
    const signedQty = (movement: (typeof item.movements)[number]) =>
      movement.kind === "RETURN"
        ? -movement.deliveredQuantity
        : movement.deliveredQuantity;

    const historicalDelivered = item.movements.reduce(
      (sum, movement) => sum + signedQty(movement),
      0,
    );

    const currentSigned = isReturn
      ? -item.currentDeliveredQuantity
      : item.currentDeliveredQuantity;

    const deliveredTotal = historicalDelivered + currentSigned;
    const remaining = item.orderedQuantity - deliveredTotal;
    const progress = item.orderedQuantity > 0
      ? Math.max(0, Math.min((deliveredTotal / item.orderedQuantity) * 100, 100))
      : 0;

    return {
      id: item.id,
      index,
      orderNumber: item.orderNumber,
      productCode: item.productCode,
      productName: item.productName ?? item.productCode,
      ordered: item.orderedQuantity,
      currentSigned,
      deliveredTotal,
      remaining,
      progress,
      movements: item.movements,
      signedQty,
    };
  });

  return (
    <div
      className={cn(
        "overflow-hidden shadow-inner",
        "bg-background m-2 rounded-md border",
        "animate-accordion-down duration-300",
      )}
    >
      <h3 className="text-foreground px-4 pt-4 text-base font-semibold">
        {t("title")}
      </h3>

      <div className="animate-in m-2 hidden max-h-100 overflow-x-auto overflow-y-auto rounded border delay-100 duration-300 md:block">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow className="bg-muted text-muted-foreground text-xs capitalize">
              <TableHead className="w-16 text-center">#</TableHead>
              <TableHead className="min-w-30">{t("columns.orderNumber")}</TableHead>
              <TableHead className="min-w-40">{t("columns.product")}</TableHead>
              <TableHead className="min-w-17.5 text-center">
                {t("columns.ordered")}
              </TableHead>
              <TableHead className="min-w-22.5 text-center">
                {t("columns.totalDelivered")}
              </TableHead>
              <TableHead className="min-w-17.5 text-center text-blue-700 dark:text-blue-400">
                {t("columns.currentDelivery")}
              </TableHead>
              <TableHead className="min-w-21.25 text-center">
                {t("columns.status")}
              </TableHead>
              <TableHead className="min-w-60">{t("columns.shipmentHistory")}</TableHead>
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
                <TableCell className="text-foreground text-center font-medium">
                  {item.index + 1}
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {item.orderNumber}
                </TableCell>
                <TableCell>
                  <div className="text-foreground font-medium">{item.productCode}</div>
                  <div className="text-muted-foreground text-xs">{item.productName}</div>
                </TableCell>
                <TableCell className="text-foreground text-center">
                  {item.ordered}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center font-semibold",
                    item.deliveredTotal < 0
                      ? "text-red-700 dark:text-red-400"
                      : "text-green-700 dark:text-green-400",
                  )}
                >
                  {item.deliveredTotal}
                </TableCell>
                <TableCell className="text-center font-semibold text-blue-700 dark:text-blue-400">
                  {item.currentSigned}
                </TableCell>
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
                            {t("status.missing", { count: item.remaining })}
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
                  <div className="flex flex-col gap-1">
                    {item.movements.length > 0 ? (
                      item.movements.map((movement) => (
                        <div
                          key={movement.id}
                          className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1 text-[11px]"
                        >
                          <div className="min-w-0">
                            <p className="text-muted-foreground">
                              {formatDateTime(movement.deliveryDate, {
                                locale,
                                timeZone,
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </p>
                            <p className="text-foreground truncate">
                              {movement.deliveryNumber}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "shrink-0 font-semibold",
                              movement.kind === "RETURN"
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400",
                            )}
                          >
                            {Math.abs(item.signedQty(movement))} {t("qtySuffix")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">{t("none")}</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!preparedItems.length ? (
              <TableRow>
                <TableCell
                  colSpan={8}
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
                <p className="text-foreground text-sm font-medium">{item.productCode}</p>
                <p className="text-muted-foreground text-xs">{item.productName}</p>
              </div>
              <span className="text-foreground rounded-md border bg-muted/20 px-2 py-1 text-[11px] font-medium">
                {item.orderNumber}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("progress")}</span>
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
                <p className="text-foreground text-sm font-semibold">{item.ordered}</p>
              </div>
              <div className="rounded-md border bg-muted/20 py-1.5">
                <p className="text-muted-foreground text-[11px]">
                  {t("columns.totalDelivered")}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    item.deliveredTotal < 0
                      ? "text-red-700 dark:text-red-400"
                      : "text-green-700 dark:text-green-400",
                  )}
                >
                  {item.deliveredTotal}
                </p>
              </div>
              <div className="rounded-md border bg-muted/20 py-1.5">
                <p className="text-muted-foreground text-[11px]">
                  {t("columns.currentDelivery")}
                </p>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  {item.currentSigned}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                item.remaining > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400",
              )}
            >
              {item.remaining > 0 ? (
                <>
                  <Clock className="h-3 w-3" />
                  {t("status.missing", { count: item.remaining })}
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3" />
                  {t("status.completed")}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">
                {t("columns.shipmentHistory")}
              </p>
              {item.movements.length > 0 ? (
                item.movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1 text-[11px]"
                  >
                    <div className="min-w-0">
                      <p className="text-muted-foreground">
                        {formatDateTime(movement.deliveryDate, {
                          locale,
                          timeZone,
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </p>
                      <p className="text-foreground truncate">{movement.deliveryNumber}</p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 font-semibold",
                        movement.kind === "RETURN"
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400",
                      )}
                    >
                      {Math.abs(item.signedQty(movement))} {t("qtySuffix")}
                    </p>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground text-xs">{t("none")}</span>
              )}
            </div>
          </div>
        ))}

        {!preparedItems.length ? (
          <div className="text-muted-foreground rounded-lg border p-4 text-center text-sm">
            {t("empty")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
