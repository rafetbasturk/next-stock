import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  customOrderItems,
  customers,
  deliveries,
  deliveryItems,
  orderItems,
  orders,
  products,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import {
  normalizeDateParam,
  normalizeParams,
  notDeleted,
  parsePositiveIds,
} from "@/lib/server/normalize";
import {
  localDateToUtcDayBounds,
  resolveRequestTimeZone,
} from "@/lib/timezone";
import {
  buildMaterialPlanningRows as aggregateMaterialPlanningRows,
  createMaterialPlanningComparator as createMaterialPlanningRowComparator,
  type MaterialPlanningSourceRow,
} from "@/lib/material-planning";
import {
  isOrderStatus,
  toCurrencyOrDefault,
  toUnitOrDefault,
  type Currency,
  type OrderStatus,
} from "@/lib/types/domain";
import {
  type OrderTrackingSearch,
  materialPlanningDefaultStatus,
  materialPlanningSearchSchema,
  orderTrackingSearchSchema,
  ordersSearchSchema,
} from "@/lib/types/search";
import type {
  MaterialPlanningMutationResponse,
  MaterialPlanningTableRow,
  OrderDetail,
  OrderTableRow,
  OrderTrackingTableRow,
} from "@/lib/types/orders";
import {
  parseMaterialPlanningPlanBody,
  parseMaterialPlanningUnplanBody,
  parseOrderMutationInput,
  parseOrderRequestedStatus,
  type OrderMutationInput,
} from "@/lib/validators/mutations";

type ServerFnPayload<TData> = {
  data: TData;
  timeZone?: string;
};
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const orderIdSchema = z.object({ id: z.number().int().positive() });
type ValidationFieldError = {
  i18n: {
    ns: "validation";
    key: "required" | "invalid";
  };
};

function failValidation(details: Record<string, ValidationFieldError>): never {
  throw new AppError("VALIDATION_ERROR", "Invalid request data.", { details });
}

function ensureAuthError(): never {
  throw new AppError("AUTH_REQUIRED");
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) ensureAuthError();
  return user;
}

const orderStatusValues = [
  "KAYIT",
  "ÜRETİM",
  "KISMEN HAZIR",
  "HAZIR",
  "BİTTİ",
  "İPTAL",
] as const satisfies ReadonlyArray<OrderStatus>;

const allowedStatuses = new Set<OrderStatus>(orderStatusValues);
const orderTrackingOpenStatusValues = [
  "KAYIT",
  "ÜRETİM",
  "KISMEN HAZIR",
  "HAZIR",
] as const satisfies ReadonlyArray<OrderStatus>;
const orderTrackingOpenStatusSet = new Set<OrderStatus>(
  orderTrackingOpenStatusValues,
);
const stockResponsiveOrderStatusValues = [
  "ÜRETİM",
  "KISMEN HAZIR",
] as const satisfies ReadonlyArray<OrderStatus>;
const materialPlanningStatusValues = [
  "KAYIT",
  "KISMEN HAZIR",
] as const satisfies ReadonlyArray<OrderStatus>;

function parseStatuses(value?: string): Array<OrderStatus> {
  if (!value) return [];

  return value
    .split("|")
    .map((status) => status.trim())
    .filter(
      (status): status is OrderStatus =>
        isOrderStatus(status) && allowedStatuses.has(status),
    );
}

type PaginatedOrdersResult = {
  data: Array<OrderTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

type PaginatedOrderTrackingResult = {
  data: Array<OrderTrackingTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

type PaginatedMaterialPlanningResult = {
  data: Array<MaterialPlanningTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

type OrderFilterOptionsResult = {
  statuses: Array<string>;
  customers: Array<{
    id: number;
    code: string;
    name: string;
  }>;
};

type OrderProductOption = {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  currency: string;
};

type OrderHistoryDelivery = {
  id: number;
  deliveredQuantity: number;
  deliveryNumber: string;
  deliveryDate: string;
  kind: "DELIVERY" | "RETURN";
};

type OrderHistoryItem = {
  id: number;
  itemType: "standard" | "custom";
  productId: number | null;
  productCode: string;
  productName: string | null;
  unitPrice: number;
  currency: Currency;
  stockQuantity: number | null;
  quantity: number;
  materialPlannedAt: string | null;
  materialPlannedBy: string | null;
  canUndoMaterialPlanning: boolean;
  deliveries: Array<OrderHistoryDelivery>;
};

type OrderHistoryResult = {
  items: Array<OrderHistoryItem>;
};

function resolveStatusFromProductStock(
  items: OrderMutationInput["items"],
  stockByProductId: Map<number, number>,
): OrderStatus {
  if (items.length === 0) return "KAYIT";

  const requiredByProductId = new Map<number, number>();

  for (const item of items) {
    const currentRequired = requiredByProductId.get(item.productId) ?? 0;
    requiredByProductId.set(item.productId, currentRequired + item.quantity);
  }

  let allEnough = true;
  let anyAvailable = false;

  for (const [productId, requiredQuantity] of requiredByProductId.entries()) {
    const stockQuantity = stockByProductId.get(productId) ?? 0;

    if (stockQuantity > 0) {
      anyAvailable = true;
    }

    if (stockQuantity < requiredQuantity) {
      allEnough = false;
    }
  }

  if (allEnough) return "HAZIR";
  if (!anyAvailable) return "KAYIT";
  return "KISMEN HAZIR";
}

function createStandardRemainingQuantityExpr(
  standardDeliveredByItemId: ReturnType<typeof createStandardDeliveredByItemIdSubquery>,
) {
  return sql<number>`
    greatest(
      ${orderItems.quantity} - coalesce(${standardDeliveredByItemId.netDelivered}, 0),
      0
    )::int
  `;
}

function clearMaterialPlanningAutoPromotionFields() {
  return {
    materialPlanningAutoPromotedAt: null,
    materialPlanningAutoPromotedBy: null,
  };
}

type RemainingStandardOrderItemRow = {
  orderId: number;
  itemId: number;
  materialPlannedAt: string | null;
};

async function getRemainingStandardOrderItemsTx(
  tx: DbTransaction,
  orderIds: ReadonlyArray<number>,
): Promise<Array<RemainingStandardOrderItemRow>> {
  const normalizedOrderIds = [...new Set(orderIds)].filter(
    (orderId) => Number.isInteger(orderId) && orderId > 0,
  );

  if (normalizedOrderIds.length === 0) {
    return [];
  }

  const standardDeliveredByItemId = createStandardDeliveredByItemIdSubquery();
  const remainingQuantityExpr = createStandardRemainingQuantityExpr(
    standardDeliveredByItemId,
  );

  return tx
    .select({
      orderId: orderItems.orderId,
      itemId: orderItems.id,
      materialPlannedAt: orderItems.materialPlannedAt,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .leftJoin(
      standardDeliveredByItemId,
      eq(standardDeliveredByItemId.itemId, orderItems.id),
    )
    .where(
      and(
        inArray(orderItems.orderId, normalizedOrderIds),
        notDeleted(orderItems),
        notDeleted(orders),
        sql`${remainingQuantityExpr} > 0`,
      ),
    );
}

function getFullyMaterialPlannedOrderIds(
  rows: ReadonlyArray<RemainingStandardOrderItemRow>,
) {
  const progressByOrderId = new Map<
    number,
    { hasRemainingItems: boolean; allPlanned: boolean }
  >();

  for (const row of rows) {
    const current = progressByOrderId.get(row.orderId) ?? {
      hasRemainingItems: false,
      allPlanned: true,
    };

    current.hasRemainingItems = true;
    if (!row.materialPlannedAt) {
      current.allPlanned = false;
    }

    progressByOrderId.set(row.orderId, current);
  }

  return new Set(
    [...progressByOrderId.entries()]
      .filter(([, value]) => value.hasRemainingItems && value.allPlanned)
      .map(([orderId]) => orderId),
  );
}

async function syncMaterialPlanningStatusesForOrdersTx(
  tx: DbTransaction,
  orderIds: ReadonlyArray<number>,
  userId: number,
) {
  const normalizedOrderIds = [...new Set(orderIds)].filter(
    (orderId) => Number.isInteger(orderId) && orderId > 0,
  );

  if (normalizedOrderIds.length === 0) {
    return;
  }

  const [orderRows, remainingRows] = await Promise.all([
    tx
      .select({
        id: orders.id,
        status: orders.status,
        materialPlanningAutoPromotedAt: orders.materialPlanningAutoPromotedAt,
      })
      .from(orders)
      .where(and(inArray(orders.id, normalizedOrderIds), notDeleted(orders))),
    getRemainingStandardOrderItemsTx(tx, normalizedOrderIds),
  ]);

  const fullyPlannedOrderIds = getFullyMaterialPlannedOrderIds(remainingRows);

  for (const order of orderRows) {
    const isFullyPlanned = fullyPlannedOrderIds.has(order.id);

    if (order.status === "KAYIT" && isFullyPlanned) {
      await tx
        .update(orders)
        .set({
          status: "ÜRETİM",
          materialPlanningAutoPromotedAt: sql`now()`,
          materialPlanningAutoPromotedBy: userId,
          updatedAt: sql`now()`,
        })
        .where(eq(orders.id, order.id));
      continue;
    }

    if (
      order.status === "ÜRETİM" &&
      order.materialPlanningAutoPromotedAt &&
      !isFullyPlanned
    ) {
      await tx
        .update(orders)
        .set({
          status: "KAYIT",
          ...clearMaterialPlanningAutoPromotionFields(),
          updatedAt: sql`now()`,
        })
        .where(eq(orders.id, order.id));
    }
  }
}

export async function syncReadyStatusesForProductsTx(
  tx: DbTransaction,
  productIds: ReadonlyArray<number>,
) {
  const normalizedProductIds = [...new Set(productIds)].filter(
    (productId) => Number.isInteger(productId) && productId > 0,
  );

  if (normalizedProductIds.length === 0) {
    return;
  }

  const candidateOrderRows = await tx
    .select({
      orderId: orders.id,
      status: orders.status,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        inArray(orderItems.productId, normalizedProductIds),
        inArray(orders.status, stockResponsiveOrderStatusValues),
        notDeleted(orderItems),
        notDeleted(orders),
      ),
    );

  if (candidateOrderRows.length === 0) {
    return;
  }

  const orderIds = [...new Set(candidateOrderRows.map((row) => row.orderId))];
  const currentStatusByOrderId = new Map(
    candidateOrderRows.map((row) => [row.orderId, row.status]),
  );

  const orderItemRows = await tx
    .select({
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(and(inArray(orderItems.orderId, orderIds), notDeleted(orderItems)));

  if (orderItemRows.length === 0) {
    return;
  }

  const involvedProductIds = [...new Set(orderItemRows.map((row) => row.productId))];
  const productRows = await tx
    .select({
      id: products.id,
      stockQuantity: products.stockQuantity,
    })
    .from(products)
    .where(and(inArray(products.id, involvedProductIds), notDeleted(products)));

  const stockByProductId = new Map(
    productRows.map((row) => [row.id, row.stockQuantity ?? 0]),
  );
  const itemsByOrderId = new Map<number, OrderMutationInput["items"]>();

  for (const row of orderItemRows) {
    const items = itemsByOrderId.get(row.orderId) ?? [];
    items.push({
      productId: row.productId,
      quantity: row.quantity,
      unitPrice: 0,
    });
    itemsByOrderId.set(row.orderId, items);
  }

  for (const orderId of orderIds) {
    const items = itemsByOrderId.get(orderId) ?? [];
    const currentStatus = currentStatusByOrderId.get(orderId);

    if (!currentStatus || items.length === 0) {
      continue;
    }

    const nextStatus = resolveStatusFromProductStock(items, stockByProductId);

    if (
      (nextStatus === "KISMEN HAZIR" || nextStatus === "HAZIR") &&
      nextStatus !== currentStatus
    ) {
      await tx
        .update(orders)
        .set({
          status: nextStatus,
          ...clearMaterialPlanningAutoPromotionFields(),
          updatedAt: sql`now()`,
        })
        .where(eq(orders.id, orderId));
    }
  }
}

function validateCreateOrderInput(input: OrderMutationInput) {
  const fieldErrors: Record<string, ValidationFieldError> = {};

  if (!input.orderNumber?.trim()) {
    fieldErrors.orderNumber = { i18n: { ns: "validation", key: "required" } };
  }
  if (!input.customerId || input.customerId <= 0) {
    fieldErrors.customerId = { i18n: { ns: "validation", key: "invalid" } };
  }
  if (!input.orderDate) {
    fieldErrors.orderDate = { i18n: { ns: "validation", key: "required" } };
  }

  if (input.isCustomOrder) {
    if (input.customItems.length === 0) {
      fieldErrors.customItems = { i18n: { ns: "validation", key: "required" } };
    }
  } else if (input.items.length === 0) {
    fieldErrors.items = { i18n: { ns: "validation", key: "required" } };
  }

  if (Object.keys(fieldErrors).length > 0) {
    failValidation(fieldErrors);
  }
}

function ensureOrderNotFound(): never {
  throw new AppError("ORDER_NOT_FOUND");
}

function ensureOrderHasDeliveries(): never {
  throw new AppError("ORDER_HAS_DELIVERIES");
}

type OrderTrackingSourceRow = Omit<
  OrderTrackingTableRow,
  "lineNumber" | "remainingQuantity" | "hasShortage" | "deliveryHistory"
> & {
  itemSortId: number;
};

function compareNullableStrings(
  left: string | null,
  right: string | null,
): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, "tr", {
    numeric: true,
    sensitivity: "base",
  });
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

function buildOrderTrackingSearchText(row: OrderTrackingTableRow): string {
  return [
    row.orderNumber,
    String(row.lineNumber),
    row.customerCode ?? "",
    row.customerName ?? "",
    row.status,
    row.deliveryAddress ?? "",
    row.notes ?? "",
    row.materialCode ?? "",
    row.materialName,
    row.stockQuantity == null ? "" : String(row.stockQuantity),
    String(row.orderedQuantity),
    String(row.deliveredQuantity),
    String(row.remainingQuantity),
    row.unit ?? "",
    row.currency ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("tr");
}

function createOrderTrackingComparator(
  sortBy: OrderTrackingSearch["sortBy"],
  sortDir: "asc" | "desc",
) {
  const direction = sortDir === "desc" ? -1 : 1;

  return (left: OrderTrackingTableRow, right: OrderTrackingTableRow) => {
    let result = 0;

    switch (sortBy) {
      case "order_number":
        result = left.orderNumber.localeCompare(right.orderNumber, "tr", {
          numeric: true,
          sensitivity: "base",
        });
        break;
      case "line_number":
        result = left.lineNumber - right.lineNumber;
        break;
      case "customer":
        result =
          compareNullableStrings(left.customerName, right.customerName) ||
          compareNullableStrings(left.customerCode, right.customerCode);
        break;
      case "status":
        result = left.status.localeCompare(right.status, "tr", {
          sensitivity: "base",
        });
        break;
      case "stock":
        result = compareNullableNumbers(left.stockQuantity, right.stockQuantity);
        break;
      case "ordered_quantity":
        result = left.orderedQuantity - right.orderedQuantity;
        break;
      case "delivered_quantity":
        result = left.deliveredQuantity - right.deliveredQuantity;
        break;
      case "remaining_quantity":
        result = left.remainingQuantity - right.remainingQuantity;
        break;
      case "unit_price":
        result = left.unitPrice - right.unitPrice;
        break;
      case "order_date":
      default:
        result = left.orderDate.localeCompare(right.orderDate);
        break;
    }

    if (result !== 0) {
      return result * direction;
    }

    return (
      right.orderDate.localeCompare(left.orderDate) ||
      left.orderNumber.localeCompare(right.orderNumber, "tr", {
        numeric: true,
        sensitivity: "base",
      }) ||
      left.lineNumber - right.lineNumber ||
      left.itemId - right.itemId
    );
  };
}

function createStandardDeliveredByItemIdSubquery() {
  return db
    .select({
      itemId: deliveryItems.orderItemId,
      netDelivered: sql<number>`
        coalesce(
          sum(
            case
              when ${deliveries.kind} = 'RETURN' then -${deliveryItems.deliveredQuantity}
              else ${deliveryItems.deliveredQuantity}
            end
          ),
          0
        )::int
      `.as("net_delivered"),
    })
    .from(deliveryItems)
    .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
    .where(
      and(
        sql`${deliveryItems.orderItemId} is not null`,
        notDeleted(deliveryItems),
        notDeleted(deliveries),
      ),
    )
    .groupBy(deliveryItems.orderItemId)
    .as("standard_delivered_by_item_id");
}

function createCustomDeliveredByItemIdSubquery() {
  return db
    .select({
      itemId: deliveryItems.customOrderItemId,
      netDelivered: sql<number>`
        coalesce(
          sum(
            case
              when ${deliveries.kind} = 'RETURN' then -${deliveryItems.deliveredQuantity}
              else ${deliveryItems.deliveredQuantity}
            end
          ),
          0
        )::int
      `.as("net_delivered"),
    })
    .from(deliveryItems)
    .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
    .where(
      and(
        sql`${deliveryItems.customOrderItemId} is not null`,
        notDeleted(deliveryItems),
        notDeleted(deliveries),
      ),
    )
    .groupBy(deliveryItems.customOrderItemId)
    .as("custom_delivered_by_item_id");
}

export async function getPaginatedOrderTracking({
  data,
  timeZone,
}: ServerFnPayload<unknown>): Promise<PaginatedOrderTrackingResult> {
  const resolvedTimeZone = resolveRequestTimeZone({
    headerTimeZone: timeZone,
  });
  const parsed = orderTrackingSearchSchema.parse(data);
  const {
    pageIndex,
    pageSize,
    q,
    sortBy = "order_number",
    sortDir = "desc",
    status,
    customerId,
    startDate,
    endDate,
    shortageOnly = false,
  } = parsed;

  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.min(Math.max(10, pageSize), 200);

  const normalizedQ = normalizeParams(q)?.toLocaleLowerCase("tr");
  const normalizedStatus = normalizeParams(status);
  const normalizedCustomerId = normalizeParams(customerId);
  const normalizedStartDate = normalizeDateParam(startDate);
  const normalizedEndDate = normalizeDateParam(endDate);

  const conditions: Array<SQL> = [notDeleted(orders), ne(orders.status, "İPTAL")];

  const statuses = parseStatuses(normalizedStatus);
  if (statuses.length > 1) {
    conditions.push(inArray(orders.status, statuses));
  } else if (statuses.length === 1) {
    conditions.push(eq(orders.status, statuses[0]));
  }

  const customerIds = parsePositiveIds(normalizedCustomerId);
  if (customerIds.length > 1) {
    conditions.push(inArray(orders.customerId, customerIds));
  } else if (customerIds.length === 1) {
    conditions.push(eq(orders.customerId, customerIds[0]));
  }

  if (normalizedStartDate) {
    const { startIso } = localDateToUtcDayBounds(
      normalizedStartDate,
      resolvedTimeZone,
    );
    conditions.push(gte(orders.orderDate, startIso));
  }

  if (normalizedEndDate) {
    const { endExclusiveIso } = localDateToUtcDayBounds(
      normalizedEndDate,
      resolvedTimeZone,
    );
    conditions.push(lt(orders.orderDate, endExclusiveIso));
  }

  const whereExpr: SQL =
    conditions.length === 1 ? conditions[0] : and(...conditions)!;

  const standardDeliveredByItemId = createStandardDeliveredByItemIdSubquery();
  const customDeliveredByItemId = createCustomDeliveredByItemIdSubquery();

  const [standardRows, customRows] = await Promise.all([
    db
      .select({
        orderId: orders.id,
        itemId: orderItems.id,
        itemType: sql<"standard">`'standard'`,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        customerId: orders.customerId,
        customerCode: customers.code,
        customerName: customers.name,
        status: orders.status,
        deliveryAddress: orders.deliveryAddress,
        notes: orders.notes,
        materialCode: products.code,
        materialName: sql<string>`
          coalesce(${products.name}, ${products.code}, '')
        `,
        stockQuantity: products.stockQuantity,
        orderedQuantity: orderItems.quantity,
        deliveredQuantity: sql<number>`
          coalesce(${standardDeliveredByItemId.netDelivered}, 0)::int
        `,
        unitPrice: orderItems.unitPrice,
        currency: orderItems.currency,
        unit: products.unit,
        itemSortId: orderItems.id,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(
        standardDeliveredByItemId,
        eq(standardDeliveredByItemId.itemId, orderItems.id),
      )
      .where(and(notDeleted(orderItems), whereExpr)),
    db
      .select({
        orderId: orders.id,
        itemId: customOrderItems.id,
        itemType: sql<"custom">`'custom'`,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        customerId: orders.customerId,
        customerCode: customers.code,
        customerName: customers.name,
        status: orders.status,
        deliveryAddress: orders.deliveryAddress,
        notes: orders.notes,
        materialCode: sql<string | null>`null`,
        materialName: customOrderItems.name,
        stockQuantity: sql<number | null>`null`,
        orderedQuantity: customOrderItems.quantity,
        deliveredQuantity: sql<number>`
          coalesce(${customDeliveredByItemId.netDelivered}, 0)::int
        `,
        unitPrice: customOrderItems.unitPrice,
        currency: customOrderItems.currency,
        unit: customOrderItems.unit,
        itemSortId: customOrderItems.id,
      })
      .from(customOrderItems)
      .innerJoin(orders, eq(orders.id, customOrderItems.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(
        customDeliveredByItemId,
        eq(customDeliveredByItemId.itemId, customOrderItems.id),
      )
      .where(and(notDeleted(customOrderItems), whereExpr)),
  ]);

  const sourceRows: Array<OrderTrackingSourceRow> = [...standardRows, ...customRows];
  const lineNumberByRowKey = new Map<string, number>();
  let currentOrderId: number | null = null;
  let currentLineNumber = 0;

  for (const row of [...sourceRows].sort(
    (left, right) =>
      left.orderId - right.orderId ||
      left.itemSortId - right.itemSortId ||
      left.itemId - right.itemId,
  )) {
    if (row.orderId !== currentOrderId) {
      currentOrderId = row.orderId;
      currentLineNumber = 1;
    } else {
      currentLineNumber += 1;
    }

    lineNumberByRowKey.set(`${row.itemType}:${row.itemId}`, currentLineNumber);
  }

  const trackedRows = sourceRows
    .map((row) => {
      const remainingQuantity = row.orderedQuantity - row.deliveredQuantity;
      const lineNumber =
        lineNumberByRowKey.get(`${row.itemType}:${row.itemId}`) ?? 1;

      return {
        ...row,
        lineNumber,
        remainingQuantity,
        hasShortage:
          row.stockQuantity != null &&
          remainingQuantity > 0 &&
          row.stockQuantity < remainingQuantity,
        deliveryHistory: [],
      } satisfies OrderTrackingTableRow;
    })
    .filter((row) => row.remainingQuantity > 0)
    .filter((row) => !shortageOnly || row.hasShortage)
    .filter((row) => {
      if (!normalizedQ) return true;
      return buildOrderTrackingSearchText(row).includes(normalizedQ);
    })
    .sort(createOrderTrackingComparator(sortBy, sortDir));

  const total = trackedRows.length;
  const pagedRows = trackedRows.slice(
    safePageIndex * safePageSize,
    safePageIndex * safePageSize + safePageSize,
  );

  const standardItemIds = pagedRows
    .filter((row) => row.itemType === "standard")
    .map((row) => row.itemId);
  const customItemIds = pagedRows
    .filter((row) => row.itemType === "custom")
    .map((row) => row.itemId);

  const [standardDeliveryRows, customDeliveryRows] = await Promise.all([
    standardItemIds.length > 0
      ? db
          .select({
            id: deliveryItems.id,
            itemId: orderItems.id,
            deliveryDate: deliveries.deliveryDate,
            deliveryNumber: deliveries.deliveryNumber,
            deliveredQuantity: deliveryItems.deliveredQuantity,
            kind: deliveries.kind,
          })
          .from(deliveryItems)
          .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
          .innerJoin(orderItems, eq(orderItems.id, deliveryItems.orderItemId))
          .where(
            and(
              inArray(orderItems.id, standardItemIds),
              notDeleted(orderItems),
              notDeleted(deliveryItems),
              notDeleted(deliveries),
            ),
          )
      : Promise.resolve([]),
    customItemIds.length > 0
      ? db
          .select({
            id: deliveryItems.id,
            itemId: customOrderItems.id,
            deliveryDate: deliveries.deliveryDate,
            deliveryNumber: deliveries.deliveryNumber,
            deliveredQuantity: deliveryItems.deliveredQuantity,
            kind: deliveries.kind,
          })
          .from(deliveryItems)
          .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
          .innerJoin(
            customOrderItems,
            eq(customOrderItems.id, deliveryItems.customOrderItemId),
          )
          .where(
            and(
              inArray(customOrderItems.id, customItemIds),
              notDeleted(customOrderItems),
              notDeleted(deliveryItems),
              notDeleted(deliveries),
            ),
          )
      : Promise.resolve([]),
  ]);

  const historyByRowKey = new Map<
    string,
    Array<{
      id: number;
      deliveryDate: string;
      deliveryNumber: string;
      deliveredQuantity: number;
      kind: "DELIVERY" | "RETURN";
    }>
  >();

  for (const delivery of standardDeliveryRows) {
    const key = `standard:${delivery.itemId}`;
    const list = historyByRowKey.get(key) ?? [];
    list.push({
      id: delivery.id,
      deliveryDate: delivery.deliveryDate,
      deliveryNumber: delivery.deliveryNumber,
      deliveredQuantity: delivery.deliveredQuantity,
      kind: delivery.kind,
    });
    historyByRowKey.set(key, list);
  }

  for (const delivery of customDeliveryRows) {
    const key = `custom:${delivery.itemId}`;
    const list = historyByRowKey.get(key) ?? [];
    list.push({
      id: delivery.id,
      deliveryDate: delivery.deliveryDate,
      deliveryNumber: delivery.deliveryNumber,
      deliveredQuantity: delivery.deliveredQuantity,
      kind: delivery.kind,
    });
    historyByRowKey.set(key, list);
  }

  const rowsWithHistory = pagedRows.map((row) => ({
    ...row,
    deliveryHistory:
      historyByRowKey
        .get(`${row.itemType}:${row.itemId}`)
        ?.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)) ?? [],
  }));

  return {
    data: rowsWithHistory,
    pageIndex: safePageIndex,
    pageSize: safePageSize,
    total,
    pageCount: Math.ceil(total / safePageSize),
  };
}

export async function getPaginatedMaterialPlanning({
  data,
}: ServerFnPayload<unknown>): Promise<PaginatedMaterialPlanningResult> {
  const parsed = materialPlanningSearchSchema.parse(data);
  const { pageIndex, pageSize } = parsed;
  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.min(Math.max(10, pageSize), 200);
  const rows = await getMaterialPlanningRows(parsed);
  const total = rows.length;
  const pagedRows = rows.slice(
    safePageIndex * safePageSize,
    safePageIndex * safePageSize + safePageSize,
  );

  return {
    data: pagedRows,
    pageIndex: safePageIndex,
    pageSize: safePageSize,
    total,
    pageCount: Math.ceil(total / safePageSize),
  };
}

export async function getMaterialPlanningRows(
  data: unknown,
): Promise<Array<MaterialPlanningTableRow>> {
  const parsed = materialPlanningSearchSchema.parse(data);
  const {
    sortBy = "purchase_quantity",
    sortDir = "desc",
  } = parsed;
  const conditions: Array<SQL> = [
    notDeleted(orderItems),
    notDeleted(orders),
    notDeleted(products),
    inArray(orders.status, materialPlanningStatusValues),
    sql`${orderItems.materialPlannedAt} is null`,
  ];

  const standardDeliveredByItemId = createStandardDeliveredByItemIdSubquery();
  const remainingQuantityExpr = createStandardRemainingQuantityExpr(
    standardDeliveredByItemId,
  );

  const sourceRows: Array<MaterialPlanningSourceRow> = await db
    .select({
      productId: products.id,
      productCode: products.code,
      productName: sql<string>`
        coalesce(${products.name}, ${products.code}, '')
      `,
      stockQuantity: products.stockQuantity,
      remainingQuantity: remainingQuantityExpr,
      material: products.material,
      specs: products.specs,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(
      standardDeliveredByItemId,
      eq(standardDeliveredByItemId.itemId, orderItems.id),
    )
    .where(
      and(
        conditions.length === 1 ? conditions[0] : and(...conditions)!,
        sql`${remainingQuantityExpr} > 0`,
      ),
    );

  return aggregateMaterialPlanningRows(sourceRows).sort(
    createMaterialPlanningRowComparator(sortBy, sortDir),
  );
}

export async function getOrderTrackingFilterOptions(): Promise<OrderFilterOptionsResult> {
  const standardDeliveredByItemId = createStandardDeliveredByItemIdSubquery();
  const customDeliveredByItemId = createCustomDeliveredByItemIdSubquery();

  const [standardRows, customRows] = await Promise.all([
    db
      .selectDistinct({
        status: orders.status,
        customerId: orders.customerId,
        customerCode: customers.code,
        customerName: customers.name,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(
        standardDeliveredByItemId,
        eq(standardDeliveredByItemId.itemId, orderItems.id),
      )
      .where(
        and(
          notDeleted(orderItems),
          notDeleted(orders),
          ne(orders.status, "İPTAL"),
          sql`${orderItems.quantity} > coalesce(${standardDeliveredByItemId.netDelivered}, 0)`,
        ),
      ),
    db
      .selectDistinct({
        status: orders.status,
        customerId: orders.customerId,
        customerCode: customers.code,
        customerName: customers.name,
      })
      .from(customOrderItems)
      .innerJoin(orders, eq(orders.id, customOrderItems.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(
        customDeliveredByItemId,
        eq(customDeliveredByItemId.itemId, customOrderItems.id),
      )
      .where(
        and(
          notDeleted(customOrderItems),
          notDeleted(orders),
          ne(orders.status, "İPTAL"),
          sql`${customOrderItems.quantity} > coalesce(${customDeliveredByItemId.netDelivered}, 0)`,
        ),
      ),
  ]);

  const statuses = [...standardRows, ...customRows]
    .map((row) => row.status?.trim())
    .filter(
      (status): status is OrderStatus =>
        isOrderStatus(status) && orderTrackingOpenStatusSet.has(status),
    )
    .sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }))
    .filter((status, index, values) => values.indexOf(status) === index);

  const customerMap = new Map<
    number,
    {
      id: number;
      code: string;
      name: string;
    }
  >();

  for (const row of [...standardRows, ...customRows]) {
    const code = row.customerCode?.trim() ?? "";
    const name = row.customerName?.trim() ?? "";

    if (!code || !name) continue;

    customerMap.set(row.customerId, {
      id: row.customerId,
      code,
      name,
    });
  }

  return {
    statuses,
    customers: [...customerMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" }),
    ),
  };
}

export async function getPaginatedOrders({
  data,
  timeZone,
}: ServerFnPayload<unknown>): Promise<PaginatedOrdersResult> {
  const resolvedTimeZone = resolveRequestTimeZone({
    headerTimeZone: timeZone,
  });
  const parsed = ordersSearchSchema.parse(data);
  const {
    pageIndex,
    pageSize,
    q,
    sortBy = "order_date",
    sortDir = "desc",
    status,
    customerId,
    startDate,
    endDate,
  } = parsed;

  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.min(Math.max(10, pageSize), 200);

  const normalizedQ = normalizeParams(q);
  const normalizedStatus = normalizeParams(status);
  const normalizedCustomerId = normalizeParams(customerId);
  const normalizedStartDate = normalizeDateParam(startDate);
  const normalizedEndDate = normalizeDateParam(endDate);

  const conditions: Array<SQL> = [notDeleted(orders)];

  if (normalizedQ) {
    const search = `%${normalizedQ}%`;
    conditions.push(
      or(
        sql`${orders.id}::text ILIKE ${search}`,
        ilike(orders.orderNumber, search),
        ilike(orders.deliveryAddress, search),
        ilike(orders.notes, search),
        ilike(customers.code, search),
        ilike(customers.name, search),
      )!,
    );
  }

  const statuses = parseStatuses(normalizedStatus);
  if (statuses.length > 1) {
    conditions.push(inArray(orders.status, statuses));
  } else if (statuses.length === 1) {
    conditions.push(eq(orders.status, statuses[0]));
  }

  const customerIds = parsePositiveIds(normalizedCustomerId);
  if (customerIds.length > 1) {
    conditions.push(inArray(orders.customerId, customerIds));
  } else if (customerIds.length === 1) {
    conditions.push(eq(orders.customerId, customerIds[0]));
  }

  if (normalizedStartDate) {
    const { startIso } = localDateToUtcDayBounds(
      normalizedStartDate,
      resolvedTimeZone,
    );
    conditions.push(gte(orders.orderDate, startIso));
  }

  if (normalizedEndDate) {
    const { endExclusiveIso } = localDateToUtcDayBounds(
      normalizedEndDate,
      resolvedTimeZone,
    );
    conditions.push(lt(orders.orderDate, endExclusiveIso));
  }

  const whereExpr: SQL =
    conditions.length === 1 ? conditions[0] : and(...conditions)!;

  const rankingExpr = normalizedQ
    ? sql<number>`
      (
        case when ${orders.id}::text = ${normalizedQ} then 1200 else 0 end
        +
        case when ${orders.id}::text ilike ${`${normalizedQ}%`} then 300 else 0 end
        +
        case when ${orders.id}::text ilike ${`%${normalizedQ}%`} then 120 else 0 end
        +
        case when ${orders.orderNumber} = ${normalizedQ} then 1000 else 0 end
        +
        case when ${orders.orderNumber} ilike ${`${normalizedQ}%`} then 250 else 0 end
        +
        case when ${orders.orderNumber} ilike ${`%${normalizedQ}%`} then 100 else 0 end
        +
        case when ${orders.deliveryAddress} ilike ${`${normalizedQ}%`} then 60 else 0 end
        +
        case when ${orders.deliveryAddress} ilike ${`%${normalizedQ}%`} then 30 else 0 end
        +
        case when ${orders.notes} ilike ${`${normalizedQ}%`} then 40 else 0 end
        +
        case when ${orders.notes} ilike ${`%${normalizedQ}%`} then 20 else 0 end
        +
        case when ${customers.code} ilike ${`${normalizedQ}%`} then 70 else 0 end
        +
        case when ${customers.code} ilike ${`%${normalizedQ}%`} then 35 else 0 end
        +
        case when ${customers.name} ilike ${`${normalizedQ}%`} then 50 else 0 end
        +
        case when ${customers.name} ilike ${`%${normalizedQ}%`} then 25 else 0 end
      )
    `
    : undefined;

  const dir = sortDir === "desc" ? desc : asc;

  const orderByExpr =
    normalizedQ && rankingExpr
      ? [desc(rankingExpr), desc(orders.orderDate), desc(orders.id)]
      : sortBy === "order_number"
      ? [dir(orders.orderNumber), desc(orders.id)]
      : sortBy === "status"
        ? [dir(orders.status), desc(orders.orderDate), desc(orders.id)]
        : sortBy === "customer"
          ? [dir(customers.name), desc(orders.orderDate), desc(orders.id)]
          : [dir(orders.orderDate), desc(orders.id)];

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(whereExpr),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        customerId: orders.customerId,
        customerCode: customers.code,
        customerName: customers.name,
        status: orders.status,
        currency: orders.currency,
        notes: orders.notes,
        deliveryAddress: orders.deliveryAddress,
        isCustomOrder: orders.isCustomOrder,
        totalAmount: sql<number>`
          coalesce(
            (
              select sum(${orderItems.unitPrice} * ${orderItems.quantity})
              from ${orderItems}
              where ${orderItems.orderId} = ${orders.id}
                and ${orderItems.deletedAt} is null
            ),
            0
          ) + coalesce(
            (
              select sum(${customOrderItems.unitPrice} * ${customOrderItems.quantity})
              from ${customOrderItems}
              where ${customOrderItems.orderId} = ${orders.id}
                and ${customOrderItems.deletedAt} is null
            ),
            0
          )
        `,
      })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(whereExpr)
      .orderBy(...orderByExpr)
      .limit(safePageSize)
      .offset(safePageIndex * safePageSize),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return {
    data: rows,
    pageIndex: safePageIndex,
    pageSize: safePageSize,
    total,
    pageCount: Math.ceil(total / safePageSize),
  };
}

export const getOrdersPaginated = getPaginatedOrders;

export async function getOrderFilterOptions(): Promise<OrderFilterOptionsResult> {
  const [statusRows, customerRows] = await Promise.all([
    db
      .selectDistinct({
        status: orders.status,
      })
      .from(orders)
      .where(notDeleted(orders)),
    db
      .selectDistinct({
        id: orders.customerId,
        code: customers.code,
        name: customers.name,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(and(notDeleted(orders), notDeleted(customers))),
  ]);

  const statuses = statusRows
    .map((row) => row.status?.trim())
    .filter((status): status is string => Boolean(status && status.length > 0))
    .sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }));

  const customersList = customerRows
    .map((row) => ({
      id: row.id,
      code: row.code.trim(),
      name: row.name.trim(),
    }))
    .filter((row) => row.code.length > 0 && row.name.length > 0)
    .sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" }),
    );

  return {
    statuses,
    customers: customersList,
  };
}

export async function getOrderProductOptions(): Promise<Array<OrderProductOption>> {
  const productRows = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      unit: products.unit,
      price: products.price,
      currency: products.currency,
    })
    .from(products)
    .where(notDeleted(products))
    .orderBy(asc(products.code), asc(products.id));

  return productRows.map((row) => ({
    id: row.id,
    code: row.code.trim(),
    name: row.name.trim(),
    unit: row.unit,
    price: row.price ?? 0,
    currency: row.currency ?? "TRY",
  }));
}

export async function getLastOrderNumber(): Promise<string | null> {
  const [lastOrder] = await db
    .select({
      orderNumber: orders.orderNumber,
    })
    .from(orders)
    .where(notDeleted(orders))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(1);

  return lastOrder?.orderNumber?.trim() || null;
}

async function hasDeliveriesForOrder(orderId: number): Promise<boolean> {
  const [standardRefs, customRefs] = await Promise.all([
    db
      .select({ id: deliveryItems.id })
      .from(deliveryItems)
      .innerJoin(orderItems, eq(orderItems.id, deliveryItems.orderItemId))
      .where(
        and(
          eq(orderItems.orderId, orderId),
          notDeleted(orderItems),
          notDeleted(deliveryItems),
        ),
      )
      .limit(1),
    db
      .select({ id: deliveryItems.id })
      .from(deliveryItems)
      .innerJoin(
        customOrderItems,
        eq(customOrderItems.id, deliveryItems.customOrderItemId),
      )
      .where(
        and(
          eq(customOrderItems.orderId, orderId),
          notDeleted(customOrderItems),
          notDeleted(deliveryItems),
        ),
      )
      .limit(1),
  ]);

  return Boolean(standardRefs[0] || customRefs[0]);
}

export async function getOrderById({
  data,
}: ServerFnPayload<{ id: number }>): Promise<OrderDetail | null> {
  const { id } = orderIdSchema.parse(data);

  const orderRows = await db
    .select({
      id: orders.id,
      isCustomOrder: orders.isCustomOrder,
      orderNumber: orders.orderNumber,
      orderDate: orders.orderDate,
      customerId: orders.customerId,
      status: orders.status,
      currency: orders.currency,
      deliveryAddress: orders.deliveryAddress,
      notes: orders.notes,
    })
    .from(orders)
    .where(and(eq(orders.id, id), notDeleted(orders)))
    .limit(1);

  const order = orderRows[0];
  if (!order) return null;

  const [standardItems, customItemsRows] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        currency: orderItems.currency,
      })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, id), notDeleted(orderItems)))
      .orderBy(asc(orderItems.id)),
    db
      .select({
        id: customOrderItems.id,
        name: customOrderItems.name,
        unit: customOrderItems.unit,
        quantity: customOrderItems.quantity,
        unitPrice: customOrderItems.unitPrice,
        currency: customOrderItems.currency,
        notes: customOrderItems.notes,
      })
      .from(customOrderItems)
      .where(and(eq(customOrderItems.orderId, id), notDeleted(customOrderItems)))
      .orderBy(asc(customOrderItems.id)),
  ]);

  return {
    ...order,
    items: standardItems,
    customItems: customItemsRows,
  };
}

export async function createOrder({
  data,
}: ServerFnPayload<unknown>) {
  await requireAuth();

  const input = parseOrderMutationInput(data);
  validateCreateOrderInput(input);
  const safeCurrency = toCurrencyOrDefault(input.currency);

  const customerRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, input.customerId!), notDeleted(customers)))
    .limit(1);

  if (!customerRows[0]) {
    failValidation({
      customerId: { i18n: { ns: "validation", key: "invalid" } },
    });
  }

  const stockByProductId = new Map<number, number>();

  if (!input.isCustomOrder) {
    const productIds = input.items.map((item) => item.productId);
    const existingRows = await db
      .select({
        id: products.id,
        stockQuantity: products.stockQuantity,
      })
      .from(products)
      .where(and(inArray(products.id, productIds), notDeleted(products)));
    const existingIdSet = new Set(existingRows.map((row) => row.id));

    for (const row of existingRows) {
      stockByProductId.set(row.id, row.stockQuantity ?? 0);
    }

    for (const [index, item] of input.items.entries()) {
      if (!existingIdSet.has(item.productId)) {
        failValidation({
          [`items[${index}].productId`]: {
            i18n: { ns: "validation", key: "invalid" },
          },
        });
      }
    }
  }

  const resolvedStatus: OrderStatus = input.isCustomOrder
    ? (input.status ?? "KAYIT")
    : resolveStatusFromProductStock(input.items, stockByProductId);

  const createdOrder = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        isCustomOrder: input.isCustomOrder,
        orderNumber: input.orderNumber!.trim(),
        orderDate: input.orderDate!,
        customerId: input.customerId!,
        status: resolvedStatus,
        currency: safeCurrency,
        deliveryAddress: input.deliveryAddress ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    if (input.isCustomOrder) {
      if (input.customItems.length > 0) {
        await tx.insert(customOrderItems).values(
          input.customItems.map((item) => ({
            orderId: order.id,
            name: item.name.trim(),
            unit: toUnitOrDefault(item.unit),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            currency: toCurrencyOrDefault(item.currency ?? safeCurrency),
            notes: item.notes ?? null,
          })),
        );
      }
    } else if (input.items.length > 0) {
      await tx.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: toCurrencyOrDefault(item.currency ?? safeCurrency),
        })),
      );
    }

    return order;
  });

  return createdOrder;
}

export async function updateOrder({
  data,
}: ServerFnPayload<{ id: number; data: unknown }>) {
  await requireAuth();

  const { id } = orderIdSchema.parse({ id: data.id });
  const requestedStatus = parseOrderRequestedStatus(data.data);

  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.id, id), notDeleted(orders)))
    .limit(1);

  const existingOrder = orderRows[0];
  if (!existingOrder) {
    ensureOrderNotFound();
  }

  if (await hasDeliveriesForOrder(id)) {
    if (!requestedStatus) {
      failValidation({
        status: { i18n: { ns: "validation", key: "invalid" } },
      });
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: requestedStatus,
        ...(requestedStatus === "ÜRETİM"
          ? {}
          : clearMaterialPlanningAutoPromotionFields()),
        updatedAt: sql`now()`,
      })
      .where(and(eq(orders.id, id), notDeleted(orders)))
      .returning();

    return updatedOrder;
  }

  const input = parseOrderMutationInput(data.data);
  validateCreateOrderInput(input);
  const safeCurrency = toCurrencyOrDefault(input.currency);

  const customerRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, input.customerId!), notDeleted(customers)))
    .limit(1);

  if (!customerRows[0]) {
    failValidation({
      customerId: { i18n: { ns: "validation", key: "invalid" } },
    });
  }

  if (!input.isCustomOrder) {
    const productIds = input.items.map((item) => item.productId);
    const existingRows = await db
      .select({ id: products.id })
      .from(products)
      .where(and(inArray(products.id, productIds), notDeleted(products)))
      .groupBy(products.id);
    const existingIdSet = new Set(existingRows.map((row) => row.id));

    for (const [index, item] of input.items.entries()) {
      if (!existingIdSet.has(item.productId)) {
        failValidation({
          [`items[${index}].productId`]: {
            i18n: { ns: "validation", key: "invalid" },
          },
        });
      }
    }
  }

  const updatedOrder = await db.transaction(async (tx) => {
    const nextStatus = input.status ?? "KAYIT";
    const [order] = await tx
      .update(orders)
      .set({
        isCustomOrder: input.isCustomOrder,
        orderNumber: input.orderNumber!.trim(),
        orderDate: input.orderDate!,
        customerId: input.customerId!,
        status: nextStatus,
        currency: safeCurrency,
        deliveryAddress: input.deliveryAddress ?? null,
        notes: input.notes ?? null,
        ...(nextStatus === "ÜRETİM"
          ? {}
          : clearMaterialPlanningAutoPromotionFields()),
        updatedAt: sql`now()`,
      })
      .where(and(eq(orders.id, id), notDeleted(orders)))
      .returning();

    await tx
      .update(orderItems)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(orderItems.orderId, id), notDeleted(orderItems)));

    await tx
      .update(customOrderItems)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(customOrderItems.orderId, id), notDeleted(customOrderItems)));

    if (input.isCustomOrder) {
      if (input.customItems.length > 0) {
        await tx.insert(customOrderItems).values(
          input.customItems.map((item) => ({
            orderId: order.id,
            name: item.name.trim(),
            unit: toUnitOrDefault(item.unit),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            currency: toCurrencyOrDefault(item.currency ?? safeCurrency),
            notes: item.notes ?? null,
          })),
        );
      }
    } else if (input.items.length > 0) {
      await tx.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: toCurrencyOrDefault(item.currency ?? safeCurrency),
        })),
      );
    }

    return order;
  });

  return updatedOrder;
}

export async function markMaterialPlanningCompleted({
  data,
}: ServerFnPayload<unknown>): Promise<MaterialPlanningMutationResponse> {
  const user = await requireAuth();
  const input = parseMaterialPlanningPlanBody(data);

  return db.transaction(async (tx) => {
    const standardDeliveredByItemId = createStandardDeliveredByItemIdSubquery();
    const remainingQuantityExpr = createStandardRemainingQuantityExpr(
      standardDeliveredByItemId,
    );

    const candidateItems = await tx
      .select({
        orderId: orderItems.orderId,
        itemId: orderItems.id,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(
        standardDeliveredByItemId,
        eq(standardDeliveredByItemId.itemId, orderItems.id),
      )
      .where(
        and(
          eq(orderItems.productId, input.productId),
          inArray(orders.status, materialPlanningStatusValues),
          notDeleted(orderItems),
          notDeleted(orders),
          sql`${orderItems.materialPlannedAt} is null`,
          sql`${remainingQuantityExpr} > 0`,
        ),
      );

    const itemIds = candidateItems.map((item) => item.itemId);
    const orderIds = [...new Set(candidateItems.map((item) => item.orderId))];

    if (itemIds.length === 0) {
      return {
        success: true,
        orderIds: [],
      };
    }

    await tx
      .update(orderItems)
      .set({
        materialPlannedAt: sql`now()`,
        materialPlannedBy: user.id,
        updatedAt: sql`now()`,
      })
      .where(inArray(orderItems.id, itemIds));

    await syncMaterialPlanningStatusesForOrdersTx(tx, orderIds, user.id);

    return {
      success: true,
      orderIds,
    };
  });
}

export async function undoMaterialPlanningCompleted({
  data,
}: ServerFnPayload<unknown>): Promise<MaterialPlanningMutationResponse> {
  const user = await requireAuth();
  const input = parseMaterialPlanningUnplanBody(data);

  return db.transaction(async (tx) => {
    const standardDeliveredByItemId = createStandardDeliveredByItemIdSubquery();
    const remainingQuantityExpr = createStandardRemainingQuantityExpr(
      standardDeliveredByItemId,
    );

    const [targetItem] = await tx
      .select({
        orderId: orderItems.orderId,
        itemId: orderItems.id,
        materialPlannedAt: orderItems.materialPlannedAt,
        remainingQuantity: remainingQuantityExpr,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(
        standardDeliveredByItemId,
        eq(standardDeliveredByItemId.itemId, orderItems.id),
      )
      .where(and(eq(orderItems.id, input.orderItemId), notDeleted(orderItems), notDeleted(orders)))
      .limit(1);

    if (!targetItem) {
      throw new AppError("ORDER_ITEM_NOT_FOUND");
    }

    if (!targetItem.materialPlannedAt || targetItem.remainingQuantity <= 0) {
      throw new AppError("VALIDATION_ERROR", "Material planning cannot be undone.");
    }

    await tx
      .update(orderItems)
      .set({
        materialPlannedAt: null,
        materialPlannedBy: null,
        updatedAt: sql`now()`,
      })
      .where(eq(orderItems.id, targetItem.itemId));

    await syncMaterialPlanningStatusesForOrdersTx(tx, [targetItem.orderId], user.id);

    return {
      success: true,
      orderIds: [targetItem.orderId],
    };
  });
}

export async function removeOrder({
  data,
}: ServerFnPayload<{ id: number }>) {
  await requireAuth();

  const { id } = orderIdSchema.parse(data);

  const orderRows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, id), notDeleted(orders)))
    .limit(1);

  if (!orderRows[0]) {
    ensureOrderNotFound();
  }

  if (await hasDeliveriesForOrder(id)) {
    ensureOrderHasDeliveries();
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orderItems)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(orderItems.orderId, id), notDeleted(orderItems)));

    await tx
      .update(customOrderItems)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(customOrderItems.orderId, id), notDeleted(customOrderItems)));

    await tx
      .update(orders)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(orders.id, id), notDeleted(orders)));
  });

  return { success: true };
}

export async function getOrderHistory({
  data,
}: ServerFnPayload<{ id: number }>): Promise<OrderHistoryResult> {
  const { id } = orderIdSchema.parse(data);

  const orderRow = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, id), notDeleted(orders)))
    .limit(1);

  if (orderRow.length === 0) {
    return { items: [] };
  }

  const standardDeliveredByItemId = createStandardDeliveredByItemIdSubquery();
  const remainingQuantityExpr = createStandardRemainingQuantityExpr(
    standardDeliveredByItemId,
  );

  const [standardItems, customItems, standardDeliveries, customDeliveries] =
    await Promise.all([
      db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          currency: orderItems.currency,
          stockQuantity: products.stockQuantity,
          productName: products.name,
          productCode: products.code,
          materialPlannedAt: orderItems.materialPlannedAt,
          materialPlannedBy: users.username,
          canUndoMaterialPlanning: sql<boolean>`
            case
              when ${orderItems.materialPlannedAt} is not null
                and ${remainingQuantityExpr} > 0
              then true
              else false
            end
          `,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .leftJoin(users, eq(users.id, orderItems.materialPlannedBy))
        .leftJoin(
          standardDeliveredByItemId,
          eq(standardDeliveredByItemId.itemId, orderItems.id),
        )
        .where(and(eq(orderItems.orderId, id), notDeleted(orderItems))),
      db
        .select({
          id: customOrderItems.id,
          quantity: customOrderItems.quantity,
          unitPrice: customOrderItems.unitPrice,
          currency: customOrderItems.currency,
          stockQuantity: sql<number | null>`null`,
          productCode: customOrderItems.name,
          productName: customOrderItems.notes,
          materialPlannedAt: sql<string | null>`null`,
          materialPlannedBy: sql<string | null>`null`,
          canUndoMaterialPlanning: sql<boolean>`false`,
        })
        .from(customOrderItems)
        .where(
          and(eq(customOrderItems.orderId, id), notDeleted(customOrderItems)),
        ),
      db
        .select({
          id: deliveryItems.id,
          orderItemId: orderItems.id,
          deliveredQuantity: deliveryItems.deliveredQuantity,
          deliveryNumber: deliveries.deliveryNumber,
          deliveryDate: deliveries.deliveryDate,
          kind: deliveries.kind,
        })
        .from(deliveryItems)
        .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
        .innerJoin(orderItems, eq(orderItems.id, deliveryItems.orderItemId))
        .where(
          and(
            eq(orderItems.orderId, id),
            notDeleted(orderItems),
            notDeleted(deliveryItems),
            notDeleted(deliveries),
          ),
        ),
      db
        .select({
          id: deliveryItems.id,
          customOrderItemId: customOrderItems.id,
          deliveredQuantity: deliveryItems.deliveredQuantity,
          deliveryNumber: deliveries.deliveryNumber,
          deliveryDate: deliveries.deliveryDate,
          kind: deliveries.kind,
        })
        .from(deliveryItems)
        .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
        .innerJoin(
          customOrderItems,
          eq(customOrderItems.id, deliveryItems.customOrderItemId),
        )
        .where(
          and(
            eq(customOrderItems.orderId, id),
            notDeleted(customOrderItems),
            notDeleted(deliveryItems),
            notDeleted(deliveries),
          ),
        ),
    ]);

  const standardDeliveriesByItemId = new Map<
    number,
    Array<OrderHistoryDelivery>
  >();
  for (const delivery of standardDeliveries) {
    const deliveryList =
      standardDeliveriesByItemId.get(delivery.orderItemId) ?? [];
    deliveryList.push({
      id: delivery.id,
      deliveredQuantity: delivery.deliveredQuantity,
      deliveryNumber: delivery.deliveryNumber,
      deliveryDate: delivery.deliveryDate,
      kind: delivery.kind,
    });
    standardDeliveriesByItemId.set(delivery.orderItemId, deliveryList);
  }

  const customDeliveriesByItemId = new Map<
    number,
    Array<OrderHistoryDelivery>
  >();
  for (const delivery of customDeliveries) {
    const deliveryList =
      customDeliveriesByItemId.get(delivery.customOrderItemId) ?? [];
    deliveryList.push({
      id: delivery.id,
      deliveredQuantity: delivery.deliveredQuantity,
      deliveryNumber: delivery.deliveryNumber,
      deliveryDate: delivery.deliveryDate,
      kind: delivery.kind,
    });
    customDeliveriesByItemId.set(delivery.customOrderItemId, deliveryList);
  }

  const items: Array<OrderHistoryItem> = [
    ...standardItems.map((item) => ({
      id: item.id,
      itemType: "standard" as const,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unitPrice: item.unitPrice,
      currency: item.currency,
      stockQuantity: item.stockQuantity,
      quantity: item.quantity,
      materialPlannedAt: item.materialPlannedAt,
      materialPlannedBy: item.materialPlannedBy,
      canUndoMaterialPlanning: item.canUndoMaterialPlanning,
      deliveries:
        standardDeliveriesByItemId
          .get(item.id)
          ?.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)) ?? [],
    })),
    ...customItems.map((item) => ({
      id: item.id,
      itemType: "custom" as const,
      productId: null,
      productCode: item.productCode,
      productName: item.productName,
      unitPrice: item.unitPrice,
      currency: item.currency,
      stockQuantity: item.stockQuantity,
      quantity: item.quantity,
      materialPlannedAt: item.materialPlannedAt,
      materialPlannedBy: item.materialPlannedBy,
      canUndoMaterialPlanning: item.canUndoMaterialPlanning,
      deliveries:
        customDeliveriesByItemId
          .get(item.id)
          ?.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)) ?? [],
    })),
  ];

  return { items };
}
