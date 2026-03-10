import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  customOrderItems,
  deliveries,
  deliveryItems,
  orderItems,
  orders,
} from "@/db/schema";
import { convertToBaseCurrency } from "@/lib/currency";
import { AppError, isAppError } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/log";
import { getErrorMessage } from "@/lib/errors/mapping";
import {
  localDateToUtcDayBounds,
  resolveRequestTimeZone,
  utcInstantToLocalDateParts,
  utcInstantToLocalYearMonth,
} from "@/lib/timezone";
import type {
  Currency,
  KeyMetricsInput,
  KeyMetricsResult,
  MonthlyOverviewInput,
  MonthlyOverviewPoint,
} from "@/lib/types/metrics";

function normalizePreferredCurrency(
  preferredCurrency?: Currency,
): Currency {
  return preferredCurrency ?? "TRY";
}

type YearMonth = {
  year: number;
  month: number;
};

function shiftYearMonth(base: YearMonth, offset: number): YearMonth {
  const probe = new Date(Date.UTC(base.year, base.month - 1 + offset, 1));

  return {
    year: probe.getUTCFullYear(),
    month: probe.getUTCMonth() + 1,
  };
}

function toLocalDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toYearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getYearUtcBounds(year: number, timeZone: string): {
  startIso: string;
  endIso: string;
} {
  const startIso = localDateToUtcDayBounds(
    toLocalDateString(year, 1, 1),
    timeZone,
  ).startIso;
  const endIso = localDateToUtcDayBounds(
    toLocalDateString(year + 1, 1, 1),
    timeZone,
  ).startIso;

  return { startIso, endIso };
}

function getRelativeMonthWindow(
  timeZone: string,
  monthCount: number,
): {
  months: Array<{ yearMonth: string; monthIndex: number }>;
  startIso: string;
  endIso: string;
} {
  const safeMonthCount = Math.max(1, monthCount);
  const nowIso = new Date().toISOString();
  const localNow = utcInstantToLocalDateParts(nowIso, timeZone);

  const endMonth: YearMonth = {
    year: localNow.year,
    month: localNow.month,
  };
  const startMonth = shiftYearMonth(endMonth, -(safeMonthCount - 1));

  const months = Array.from({ length: safeMonthCount }, (_, index) => {
    const current = shiftYearMonth(startMonth, index);

    return {
      yearMonth: toYearMonthKey(current.year, current.month),
      monthIndex: current.month - 1,
    };
  });

  const windowStartIso = localDateToUtcDayBounds(
    toLocalDateString(startMonth.year, startMonth.month, 1),
    timeZone,
  ).startIso;
  const monthAfterEnd = shiftYearMonth(endMonth, 1);
  const windowEndIso = localDateToUtcDayBounds(
    toLocalDateString(monthAfterEnd.year, monthAfterEnd.month, 1),
    timeZone,
  ).startIso;

  return {
    months,
    startIso: windowStartIso,
    endIso: windowEndIso,
  };
}

export async function getKeyMetrics(
  data: KeyMetricsInput,
): Promise<KeyMetricsResult> {
  try {
    const { customerId, year } = data.filters ?? {};
    const preferredCurrency = normalizePreferredCurrency(data.preferredCurrency);
    const resolvedTimeZone = resolveRequestTimeZone({
      headerTimeZone: data.timeZone,
    });

    const whereConditions: Array<SQL> = [
      isNull(orders.deletedAt),
      ne(orders.status, "İPTAL"),
    ];

    if (typeof customerId === "number") {
      whereConditions.push(eq(orders.customerId, customerId));
    }

    if (typeof year === "number") {
      const { startIso, endIso } = getYearUtcBounds(year, resolvedTimeZone);

      whereConditions.push(gte(orders.orderDate, startIso));
      whereConditions.push(lt(orders.orderDate, endIso));
    }

    const matchingOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
      })
      .from(orders)
      .where(and(...whereConditions));

    if (matchingOrders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        deliveredRevenue: 0,
        pendingOrders: 0,
      };
    }

    const orderIds = matchingOrders.map((order) => order.id);
    const orderIdSet = new Set(orderIds);

    const standardItems = await db
      .select({
        orderId: orderItems.orderId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        currency: orderItems.currency,
      })
      .from(orderItems)
      .where(and(inArray(orderItems.orderId, orderIds), isNull(orderItems.deletedAt)));

    const customItems = await db
      .select({
        orderId: customOrderItems.orderId,
        quantity: customOrderItems.quantity,
        unitPrice: customOrderItems.unitPrice,
        currency: customOrderItems.currency,
      })
      .from(customOrderItems)
      .where(
        and(
          inArray(customOrderItems.orderId, orderIds),
          isNull(customOrderItems.deletedAt),
        ),
      );

    const allItems = [...standardItems, ...customItems];
    const orderRevenueMap = new Map<number, number>();

    for (const item of allItems) {
      const amount = item.unitPrice * item.quantity;
      const converted = convertToBaseCurrency(
        amount,
        item.currency,
        preferredCurrency,
        data.rates,
      );

      orderRevenueMap.set(
        item.orderId,
        (orderRevenueMap.get(item.orderId) ?? 0) + converted,
      );
    }

    const deliveredRows = await db
      .select({
        deliveredQuantity: deliveryItems.deliveredQuantity,
        kind: deliveries.kind,
        standardOrderId: orderItems.orderId,
        standardPrice: orderItems.unitPrice,
        standardCurrency: orderItems.currency,
        customOrderId: customOrderItems.orderId,
        customPrice: customOrderItems.unitPrice,
        customCurrency: customOrderItems.currency,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveryItems.deliveryId, deliveries.id))
      .leftJoin(
        orderItems,
        and(eq(deliveryItems.orderItemId, orderItems.id), isNull(orderItems.deletedAt)),
      )
      .leftJoin(
        customOrderItems,
        and(
          eq(deliveryItems.customOrderItemId, customOrderItems.id),
          isNull(customOrderItems.deletedAt),
        ),
      )
      .where(and(isNull(deliveryItems.deletedAt), isNull(deliveries.deletedAt)));

    const deliveredMap = new Map<number, number>();

    for (const row of deliveredRows) {
      const orderId = row.standardOrderId ?? row.customOrderId;
      if (!orderId || !orderIdSet.has(orderId)) {
        continue;
      }

      const unitPrice = row.standardPrice ?? row.customPrice ?? 0;
      const currency = (row.standardCurrency ?? row.customCurrency ?? "TRY") as Currency;
      const signedQuantity =
        row.kind === "RETURN" ? -row.deliveredQuantity : row.deliveredQuantity;
      const deliveredAmount = signedQuantity * unitPrice;

      const converted = convertToBaseCurrency(
        deliveredAmount,
        currency,
        preferredCurrency,
        data.rates,
      );

      deliveredMap.set(orderId, (deliveredMap.get(orderId) ?? 0) + converted);
    }

    const totalRevenue = Math.round(
      Array.from(orderRevenueMap.values()).reduce((sum, value) => sum + value, 0),
    );
    const deliveredRevenue = Math.round(
      Array.from(deliveredMap.values()).reduce((sum, value) => sum + value, 0),
    );
    const pendingOrders = matchingOrders.filter(
      (order) => order.status !== "BİTTİ" && order.status !== "İPTAL",
    ).length;

    return {
      totalOrders: matchingOrders.length,
      totalRevenue,
      deliveredRevenue,
      pendingOrders,
    };
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    logError("getKeyMetrics failed", error);
    throw new AppError("METRICS_FETCH_FAILED", getErrorMessage("METRICS_FETCH_FAILED"), {
      cause: error,
    });
  }
}

export async function getMonthlyOverview(
  data: MonthlyOverviewInput,
): Promise<Array<MonthlyOverviewPoint>> {
  try {
    const { customerId, year } = data.filters ?? {};
    const preferredCurrency = normalizePreferredCurrency(data.preferredCurrency);
    const resolvedTimeZone = resolveRequestTimeZone({
      headerTimeZone: data.timeZone,
    });

    const safeMonthCount = Math.max(1, data.monthCount ?? 12);

    const monthWindow =
      typeof year === "number"
        ? {
            months: Array.from({ length: 12 }, (_, index) => ({
              yearMonth: toYearMonthKey(year, index + 1),
              monthIndex: index,
            })),
            ...getYearUtcBounds(year, resolvedTimeZone),
          }
        : getRelativeMonthWindow(resolvedTimeZone, safeMonthCount);

    const orderWhere: Array<SQL> = [
      isNull(orders.deletedAt),
      ne(orders.status, "İPTAL"),
      gte(orders.orderDate, monthWindow.startIso),
      lt(orders.orderDate, monthWindow.endIso),
    ];

    const deliveriesWhere: Array<SQL> = [
      isNull(deliveries.deletedAt),
      gte(deliveries.deliveryDate, monthWindow.startIso),
      lt(deliveries.deliveryDate, monthWindow.endIso),
    ];

    if (typeof customerId === "number") {
      orderWhere.push(eq(orders.customerId, customerId));
      deliveriesWhere.push(eq(deliveries.customerId, customerId));
    }

    const scopedOrders = await db
      .select({
        id: orders.id,
        orderDate: orders.orderDate,
      })
      .from(orders)
      .where(and(...orderWhere));

    if (scopedOrders.length === 0) {
      return monthWindow.months.map(({ yearMonth, monthIndex }) => ({
        yearMonth,
        monthIndex,
        orders: 0,
        deliveries: 0,
        revenue: 0,
        deliveredRevenue: 0,
      }));
    }

    const orderIds = scopedOrders.map((order) => order.id);

    const [standardItems, customItems] = await Promise.all([
      db
        .select({
          orderId: orderItems.orderId,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          currency: orderItems.currency,
        })
        .from(orderItems)
        .where(and(inArray(orderItems.orderId, orderIds), isNull(orderItems.deletedAt))),

      db
        .select({
          orderId: customOrderItems.orderId,
          quantity: customOrderItems.quantity,
          unitPrice: customOrderItems.unitPrice,
          currency: customOrderItems.currency,
        })
        .from(customOrderItems)
        .where(
          and(
            inArray(customOrderItems.orderId, orderIds),
            isNull(customOrderItems.deletedAt),
          ),
        ),
    ]);

    const deliveryRows = await db
      .select({
        deliveryId: deliveryItems.deliveryId,
        deliveryDate: deliveries.deliveryDate,
        kind: deliveries.kind,
        deliveredQuantity: deliveryItems.deliveredQuantity,
        standardOrderId: orderItems.orderId,
        standardPrice: orderItems.unitPrice,
        standardCurrency: orderItems.currency,
        customOrderId: customOrderItems.orderId,
        customPrice: customOrderItems.unitPrice,
        customCurrency: customOrderItems.currency,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveryItems.deliveryId, deliveries.id))
      .leftJoin(
        orderItems,
        and(eq(deliveryItems.orderItemId, orderItems.id), isNull(orderItems.deletedAt)),
      )
      .leftJoin(
        customOrderItems,
        and(
          eq(deliveryItems.customOrderItemId, customOrderItems.id),
          isNull(customOrderItems.deletedAt),
        ),
      )
      .where(and(...deliveriesWhere, isNull(deliveryItems.deletedAt)));

    const buckets = new Map<
      string,
      {
        orders: Set<number>;
        deliveries: Set<number>;
        revenue: number;
        deliveredRevenue: number;
      }
    >();

    function ensureBucket(yearMonth: string) {
      if (!buckets.has(yearMonth)) {
        buckets.set(yearMonth, {
          orders: new Set(),
          deliveries: new Set(),
          revenue: 0,
          deliveredRevenue: 0,
        });
      }

      return buckets.get(yearMonth)!;
    }

    const orderDateMap = new Map<number, string>();

    for (const order of scopedOrders) {
      const yearMonth = utcInstantToLocalYearMonth(order.orderDate, resolvedTimeZone);
      orderDateMap.set(order.id, yearMonth);
      ensureBucket(yearMonth).orders.add(order.id);
    }

    for (const item of [...standardItems, ...customItems]) {
      const yearMonth = orderDateMap.get(item.orderId);
      if (!yearMonth) {
        continue;
      }

      const converted = convertToBaseCurrency(
        item.quantity * item.unitPrice,
        item.currency,
        preferredCurrency,
        data.rates,
      );

      ensureBucket(yearMonth).revenue += converted;
    }

    for (const delivery of deliveryRows) {
      if (!delivery.deliveryDate) {
        continue;
      }

      const yearMonth = utcInstantToLocalYearMonth(
        delivery.deliveryDate,
        resolvedTimeZone,
      );
      ensureBucket(yearMonth).deliveries.add(delivery.deliveryId);

      const unitPrice = delivery.standardPrice ?? delivery.customPrice ?? 0;
      const currency = (delivery.standardCurrency ??
        delivery.customCurrency ??
        "TRY") as Currency;
      const signedQuantity =
        delivery.kind === "RETURN"
          ? -delivery.deliveredQuantity
          : delivery.deliveredQuantity;

      const converted = convertToBaseCurrency(
        signedQuantity * unitPrice,
        currency,
        preferredCurrency,
        data.rates,
      );

      ensureBucket(yearMonth).deliveredRevenue += converted;
    }

    return monthWindow.months.map(({ yearMonth, monthIndex }) => {
      const bucket = buckets.get(yearMonth);

      return {
        yearMonth,
        monthIndex,
        orders: bucket?.orders.size ?? 0,
        deliveries: bucket?.deliveries.size ?? 0,
        revenue: Math.round(bucket?.revenue ?? 0),
        deliveredRevenue: Math.round(bucket?.deliveredRevenue ?? 0),
      };
    });
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    logError("getMonthlyOverview failed", error);
    throw new AppError("METRICS_FETCH_FAILED", getErrorMessage("METRICS_FETCH_FAILED"), {
      cause: error,
    });
  }
}
