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

import { db } from "@/db";
import {
  customers,
  customOrderItems,
  deliveries,
  deliveryItems,
  orderItems,
  orders,
  products,
  stockMovements,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { syncReadyStatusesForProductsTx } from "@/lib/server/orders";
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
  deliveriesSearchSchema,
  type DeliveriesSearch,
} from "@/lib/types/search";
import type {
  DeliveryDetail,
  DeliveryTableRow,
} from "@/lib/types/deliveries";
import {
  isDeliveryKind,
  type Currency,
  type DeliveryKind,
} from "@/lib/types/domain";
import {
  parseDeliveryMutationInput,
  type DeliveryMutationInput,
} from "@/lib/validators/mutations";

type ServerFnPayload<TData> = {
  data: TData;
  timeZone?: string;
};

const deliveryKindValues = ["DELIVERY", "RETURN"] as const satisfies ReadonlyArray<DeliveryKind>;

function parseKinds(value?: string): Array<DeliveryKind> {
  if (!value) return [];

  return value
    .split(/[,|]/)
    .map((kind) => kind.trim())
    .filter((kind): kind is DeliveryKind => isDeliveryKind(kind));
}

type ValidationFieldError = {
  i18n: {
    ns: "validation";
    key: "required" | "invalid" | "insufficientStock";
  };
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function failValidation(details: Record<string, ValidationFieldError>): never {
  throw new AppError("VALIDATION_ERROR", "Invalid request data.", { details });
}

function ensureAuthError(): never {
  throw new AppError("AUTH_REQUIRED");
}

function ensureDeliveryNotFound(): never {
  throw new AppError("DELIVERY_NOT_FOUND");
}

function ensureReturnQuantityExceeded(): never {
  throw new AppError("RETURN_QUANTITY_EXCEEDS_DELIVERED");
}

function ensureDeliveryKindChangeNotAllowed(): never {
  throw new AppError("DELIVERY_KIND_CHANGE_NOT_ALLOWED");
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) ensureAuthError();
  return user;
}

function validateDeliveryMutationInput(input: DeliveryMutationInput) {
  const fieldErrors: Record<string, ValidationFieldError> = {};

  if (!input.customerId || input.customerId <= 0) {
    fieldErrors.customerId = { i18n: { ns: "validation", key: "invalid" } };
  }

  if (!input.deliveryNumber?.trim()) {
    fieldErrors.deliveryNumber = {
      i18n: { ns: "validation", key: "required" },
    };
  }

  if (!input.deliveryDate) {
    fieldErrors.deliveryDate = {
      i18n: { ns: "validation", key: "required" },
    };
  }

  if (!input.items.length) {
    fieldErrors.items = { i18n: { ns: "validation", key: "required" } };
  }

  if (Object.keys(fieldErrors).length > 0) {
    failValidation(fieldErrors);
  }
}

function resolveDeliveryStockMovement(kind: DeliveryKind, quantity: number) {
  return {
    quantity: kind === "RETURN" ? quantity : -quantity,
    movementType: kind,
    notePrefix: kind === "RETURN" ? "Return" : "Delivery",
  } as const;
}

async function createDeliveryStockMovementTx(
  tx: DbTransaction,
  input: {
    productId: number;
    quantity: number;
    movementType: "DELIVERY" | "RETURN";
    referenceId: number;
    createdBy: number;
    notes?: string | null;
  },
) {
  await tx.insert(stockMovements).values({
    productId: input.productId,
    quantity: input.quantity,
    movementType: input.movementType,
    referenceType: "delivery",
    referenceId: input.referenceId,
    createdBy: input.createdBy,
    notes: input.notes ?? null,
  });

  await tx
    .update(products)
    .set({
      stockQuantity: sql`${products.stockQuantity} + ${input.quantity}`,
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, input.productId));
}

async function removeDeliveryStockMovementsTx(
  tx: DbTransaction,
  deliveryId: number,
): Promise<Array<number>> {
  const existingMovements = await tx
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      quantity: stockMovements.quantity,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.referenceType, "delivery"),
        eq(stockMovements.referenceId, deliveryId),
        notDeleted(stockMovements),
      ),
    );

  const increasedStockProductIds = new Set<number>();

  for (const movement of existingMovements) {
    const rollbackDelta = -movement.quantity;
    await tx
      .update(products)
      .set({
        stockQuantity: sql`${products.stockQuantity} + ${rollbackDelta}`,
        updatedAt: sql`now()`,
      })
      .where(eq(products.id, movement.productId));

    if (rollbackDelta > 0) {
      increasedStockProductIds.add(movement.productId);
    }
  }

  await tx
    .update(stockMovements)
    .set({
      deletedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(stockMovements.referenceType, "delivery"),
        eq(stockMovements.referenceId, deliveryId),
        notDeleted(stockMovements),
      ),
    );

  return [...increasedStockProductIds];
}

async function recalculateOrderStatusTx(tx: DbTransaction, orderId: number) {
  const [order] = await tx
    .select({
      id: orders.id,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), notDeleted(orders)))
    .limit(1);

  if (!order || order.status === "İPTAL") return;

  const standardBaseRows = await tx
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), notDeleted(orderItems)));

  const standardDeliveredById = new Map<number, number>();
  if (standardBaseRows.length > 0) {
    const standardDeliveryRows = await tx
      .select({
        orderItemId: deliveryItems.orderItemId,
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
        `,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .where(
        and(
          inArray(
            deliveryItems.orderItemId,
            standardBaseRows.map((row) => row.id),
          ),
          notDeleted(deliveryItems),
          notDeleted(deliveries),
        ),
      )
      .groupBy(deliveryItems.orderItemId);

    for (const row of standardDeliveryRows) {
      if (!row.orderItemId) continue;
      standardDeliveredById.set(row.orderItemId, Number(row.netDelivered ?? 0));
    }
  }

  const standardRows = standardBaseRows.map((row) => ({
    quantity: row.quantity,
    netDelivered: standardDeliveredById.get(row.id) ?? 0,
  }));

  const customBaseRows = await tx
    .select({
      id: customOrderItems.id,
      quantity: customOrderItems.quantity,
    })
    .from(customOrderItems)
    .where(and(eq(customOrderItems.orderId, orderId), notDeleted(customOrderItems)));

  const customDeliveredById = new Map<number, number>();
  if (customBaseRows.length > 0) {
    const customDeliveryRows = await tx
      .select({
        customOrderItemId: deliveryItems.customOrderItemId,
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
        `,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .where(
        and(
          inArray(
            deliveryItems.customOrderItemId,
            customBaseRows.map((row) => row.id),
          ),
          notDeleted(deliveryItems),
          notDeleted(deliveries),
        ),
      )
      .groupBy(deliveryItems.customOrderItemId);

    for (const row of customDeliveryRows) {
      if (!row.customOrderItemId) continue;
      customDeliveredById.set(
        row.customOrderItemId,
        Number(row.netDelivered ?? 0),
      );
    }
  }

  const customRows = customBaseRows.map((row) => ({
    quantity: row.quantity,
    netDelivered: customDeliveredById.get(row.id) ?? 0,
  }));

  const allRows = [...standardRows, ...customRows];
  const allDelivered =
    allRows.length > 0 &&
    allRows.every(
      (item) => Number(item.netDelivered ?? 0) >= Number(item.quantity ?? 0),
    );
  const anyDelivered = allRows.some((item) => Number(item.netDelivered ?? 0) > 0);

  let nextStatus = order.status;

  if (allDelivered) {
    nextStatus = "BİTTİ";
  } else if (order.status === "BİTTİ") {
    nextStatus = anyDelivered ? "KISMEN HAZIR" : "KAYIT";
  }

  if (nextStatus !== order.status) {
    await tx
      .update(orders)
      .set({
        status: nextStatus,
        updatedAt: sql`now()`,
      })
      .where(eq(orders.id, orderId));
  }
}

type PaginatedDeliveriesResult = {
  data: Array<DeliveryTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

type DeliveryFilterOptionsResult = {
  customers: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  kinds: Array<DeliveryKind>;
};

type DeliveryHistoryMovement = {
  id: number;
  deliveredQuantity: number;
  deliveryNumber: string;
  deliveryDate: string;
  kind: DeliveryKind;
};

export type DeliveryHistoryItem = {
  id: number;
  itemType: "standard" | "custom";
  orderNumber: string;
  productCode: string;
  productName: string | null;
  orderedQuantity: number;
  currentDeliveredQuantity: number;
  movements: Array<DeliveryHistoryMovement>;
};

type DeliveryHistoryResult = {
  deliveryNumber: string;
  kind: DeliveryKind;
  items: Array<DeliveryHistoryItem>;
};

type DeliveryLabelExportRow = {
  orderNumber: string;
  deliveryAddress: string;
  productCode: string;
  productName: string;
  deliveryQuantity: number;
  unit: string;
  sortId: number;
};

export type DeliveryLabelExportResult = {
  deliveryNumber: string;
  kind: DeliveryKind;
  rows: Array<{
    orderNumber: string;
    deliveryAddress: string;
    productCode: string;
    productName: string;
    deliveryQuantity: number;
    unit: string;
  }>;
};

export async function getPaginatedDeliveries({
  data,
  timeZone,
}: ServerFnPayload<unknown>): Promise<PaginatedDeliveriesResult> {
  const resolvedTimeZone = resolveRequestTimeZone({
    headerTimeZone: timeZone,
  });
  const parsed = deliveriesSearchSchema.parse(data);
  const {
    pageIndex,
    pageSize,
    q,
    sortBy = "delivery_date",
    sortDir = "desc",
    customerId,
    kind,
    startDate,
    endDate,
  } = parsed;

  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.min(Math.max(10, pageSize), 100);

  const normalizedQ = normalizeParams(q);
  const normalizedCustomerId = normalizeParams(customerId);
  const normalizedKind = normalizeParams(kind);
  const normalizedStartDate = normalizeDateParam(startDate);
  const normalizedEndDate = normalizeDateParam(endDate);

  const conditions: Array<SQL> = [notDeleted(deliveries)];

  if (normalizedQ) {
    const search = `%${normalizedQ}%`;
    conditions.push(
      or(
        sql`${deliveries.id}::text ILIKE ${search}`,
        ilike(deliveries.deliveryNumber, search),
        ilike(deliveries.notes, search),
      )!,
    );
  }

  const customerIds = parsePositiveIds(normalizedCustomerId);
  if (customerIds.length > 1) {
    conditions.push(inArray(deliveries.customerId, customerIds));
  } else if (customerIds.length === 1) {
    conditions.push(eq(deliveries.customerId, customerIds[0]));
  }

  const kinds = parseKinds(normalizedKind);
  if (kinds.length > 1) {
    conditions.push(inArray(deliveries.kind, kinds));
  } else if (kinds.length === 1) {
    conditions.push(eq(deliveries.kind, kinds[0]));
  }

  if (normalizedStartDate) {
    const { startIso } = localDateToUtcDayBounds(
      normalizedStartDate,
      resolvedTimeZone,
    );
    conditions.push(gte(deliveries.deliveryDate, startIso));
  }

  if (normalizedEndDate) {
    const { endExclusiveIso } = localDateToUtcDayBounds(
      normalizedEndDate,
      resolvedTimeZone,
    );
    conditions.push(lt(deliveries.deliveryDate, endExclusiveIso));
  }

  const whereExpr: SQL =
    conditions.length === 1 ? conditions[0] : and(...conditions)!;

  const rankingExpr = normalizedQ
    ? sql<number>`
      (
        case when ${deliveries.id}::text = ${normalizedQ} then 1200 else 0 end
        +
        case when ${deliveries.id}::text ilike ${`${normalizedQ}%`} then 300 else 0 end
        +
        case when ${deliveries.id}::text ilike ${`%${normalizedQ}%`} then 120 else 0 end
        +
        case when ${deliveries.deliveryNumber} = ${normalizedQ} then 1000 else 0 end
        +
        case when ${deliveries.deliveryNumber} ilike ${`${normalizedQ}%`} then 200 else 0 end
        +
        case when ${deliveries.deliveryNumber} ilike ${`%${normalizedQ}%`} then 80 else 0 end
        +
        case when ${deliveries.notes} ilike ${`${normalizedQ}%`} then 40 else 0 end
        +
        case when ${deliveries.notes} ilike ${`%${normalizedQ}%`} then 20 else 0 end
      )
    `
    : undefined;

  const standardTotalExpr = sql<number>`
    coalesce(
      (
        select sum(${deliveryItems.deliveredQuantity} * ${orderItems.unitPrice})
        from ${deliveryItems}
        inner join ${orderItems} on ${orderItems.id} = ${deliveryItems.orderItemId}
        where ${deliveryItems.deliveryId} = ${deliveries.id}
          and ${deliveryItems.deletedAt} is null
          and ${orderItems.deletedAt} is null
      ),
      0
    )
  `;

  const customTotalExpr = sql<number>`
    coalesce(
      (
        select sum(${deliveryItems.deliveredQuantity} * ${customOrderItems.unitPrice})
        from ${deliveryItems}
        inner join ${customOrderItems} on ${customOrderItems.id} = ${deliveryItems.customOrderItemId}
        where ${deliveryItems.deliveryId} = ${deliveries.id}
          and ${deliveryItems.deletedAt} is null
          and ${customOrderItems.deletedAt} is null
      ),
      0
    )
  `;

  const totalAmountExpr = sql<number>`
    (case when ${deliveries.kind} = 'RETURN' then -1 else 1 end)
    * (${standardTotalExpr} + ${customTotalExpr})
  `;

  const currencyExpr = sql<Currency>`
    coalesce(
      (
        select ${orderItems.currency}
        from ${deliveryItems}
        inner join ${orderItems} on ${orderItems.id} = ${deliveryItems.orderItemId}
        where ${deliveryItems.deliveryId} = ${deliveries.id}
          and ${deliveryItems.deletedAt} is null
          and ${orderItems.deletedAt} is null
        limit 1
      ),
      (
        select ${customOrderItems.currency}
        from ${deliveryItems}
        inner join ${customOrderItems} on ${customOrderItems.id} = ${deliveryItems.customOrderItemId}
        where ${deliveryItems.deliveryId} = ${deliveries.id}
          and ${deliveryItems.deletedAt} is null
          and ${customOrderItems.deletedAt} is null
        limit 1
      ),
      'TRY'
    )
  `;

  const dir = sortDir === "asc" ? asc : desc;

  const orderByExpr =
    normalizedQ && rankingExpr
      ? [desc(rankingExpr), desc(deliveries.deliveryDate), asc(deliveries.id)]
      : sortBy === "delivery_number"
        ? [dir(deliveries.deliveryNumber), desc(deliveries.deliveryDate), asc(deliveries.id)]
        : sortBy === "kind"
          ? [dir(deliveries.kind), desc(deliveries.deliveryDate), asc(deliveries.id)]
          : sortBy === "customer"
            ? [dir(customers.name), desc(deliveries.deliveryDate), asc(deliveries.id)]
            : [dir(deliveries.deliveryDate), asc(deliveries.id)];

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveries)
      .leftJoin(customers, eq(customers.id, deliveries.customerId))
      .where(whereExpr),
    db
      .select({
        id: deliveries.id,
        customerId: deliveries.customerId,
        customerCode: customers.code,
        customerName: customers.name,
        deliveryNumber: deliveries.deliveryNumber,
        deliveryDate: deliveries.deliveryDate,
        notes: deliveries.notes,
        kind: deliveries.kind,
        totalAmount: totalAmountExpr,
        currency: currencyExpr,
      })
      .from(deliveries)
      .leftJoin(customers, eq(customers.id, deliveries.customerId))
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

export async function getDeliveryFilterOptions(): Promise<DeliveryFilterOptionsResult> {
  const [customerRows, kindRows] = await Promise.all([
    db
      .select({
        id: customers.id,
        code: customers.code,
        name: customers.name,
      })
      .from(deliveries)
      .innerJoin(customers, eq(customers.id, deliveries.customerId))
      .where(and(notDeleted(deliveries), notDeleted(customers)))
      .groupBy(customers.id, customers.code, customers.name),
    db
      .selectDistinct({
        kind: deliveries.kind,
      })
      .from(deliveries)
      .where(notDeleted(deliveries)),
  ]);

  const customersList = customerRows
    .map((row) => ({
      id: row.id,
      code: row.code.trim(),
      name: row.name.trim(),
    }))
    .filter((row) => row.code.length > 0 && row.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));

  const kinds = kindRows
    .map((row) => row.kind)
    .filter((kind): kind is DeliveryKind => isDeliveryKind(kind));

  const kindOrder = new Map<DeliveryKind, number>(
    deliveryKindValues.map((value, index) => [value, index]),
  );

  kinds.sort((a, b) => (kindOrder.get(a) ?? 0) - (kindOrder.get(b) ?? 0));

  return {
    customers: customersList,
    kinds,
  };
}

export async function getLastDeliveryNumber(): Promise<string | null> {
  const [lastDelivery] = await db
    .select({
      deliveryNumber: deliveries.deliveryNumber,
    })
    .from(deliveries)
    .where(and(notDeleted(deliveries), eq(deliveries.kind, "DELIVERY")))
    .orderBy(desc(deliveries.createdAt), desc(deliveries.id))
    .limit(1);

  return lastDelivery?.deliveryNumber?.trim() || null;
}

export async function getLastReturnDeliveryNumber(): Promise<string | null> {
  const [lastReturn] = await db
    .select({
      deliveryNumber: deliveries.deliveryNumber,
    })
    .from(deliveries)
    .where(and(notDeleted(deliveries), eq(deliveries.kind, "RETURN")))
    .orderBy(desc(deliveries.createdAt), desc(deliveries.id))
    .limit(1);

  return lastReturn?.deliveryNumber?.trim() || null;
}

export type DeliveryOrderOption = {
  id: number;
  orderNumber: string;
  customerId: number;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    unit: string;
    unitPrice: number;
    currency: string;
    stockQuantity: number;
    product: {
      code: string;
      name: string;
    };
    deliveries: Array<{
      id: number;
      deliveredQuantity: number;
      delivery: {
        kind: DeliveryKind;
      };
    }>;
  }>;
  customItems: Array<{
    id: number;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    currency: string;
    notes: string | null;
    deliveries: Array<{
      id: number;
      deliveredQuantity: number;
      delivery: {
        kind: DeliveryKind;
      };
    }>;
  }>;
};

type DeliveryMutationResult = {
  success: true;
};

async function assertReturnQuantitiesWithinDeliveredTx(
  tx: DbTransaction,
  items: DeliveryMutationInput["items"],
  excludeDeliveryId?: number,
) {
  const standardRequested = new Map<number, number>();
  const customRequested = new Map<number, number>();

  for (const item of items) {
    if (item.orderItemId) {
      standardRequested.set(
        item.orderItemId,
        (standardRequested.get(item.orderItemId) ?? 0) + item.deliveredQuantity,
      );
    }
    if (item.customOrderItemId) {
      customRequested.set(
        item.customOrderItemId,
        (customRequested.get(item.customOrderItemId) ?? 0) + item.deliveredQuantity,
      );
    }
  }

  const netExpr = sql<number>`
    coalesce(
      sum(
        case
          when ${deliveries.kind} = 'RETURN' then -${deliveryItems.deliveredQuantity}
          else ${deliveryItems.deliveredQuantity}
        end
      ),
      0
    )::int
  `;

  if (standardRequested.size > 0) {
    const conditions: Array<SQL> = [
      inArray(deliveryItems.orderItemId, [...standardRequested.keys()]),
      notDeleted(deliveryItems),
      notDeleted(deliveries),
    ];

    if (excludeDeliveryId) {
      conditions.push(ne(deliveries.id, excludeDeliveryId));
    }

    const rows = await tx
      .select({
        orderItemId: deliveryItems.orderItemId,
        netDelivered: netExpr,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .where(and(...conditions))
      .groupBy(deliveryItems.orderItemId);

    const netByItemId = new Map<number, number>();
    for (const row of rows) {
      if (!row.orderItemId) continue;
      netByItemId.set(row.orderItemId, Number(row.netDelivered ?? 0));
    }

    for (const [itemId, requested] of standardRequested) {
      const delivered = netByItemId.get(itemId) ?? 0;
      if (requested > delivered) {
        ensureReturnQuantityExceeded();
      }
    }
  }

  if (customRequested.size > 0) {
    const conditions: Array<SQL> = [
      inArray(deliveryItems.customOrderItemId, [...customRequested.keys()]),
      notDeleted(deliveryItems),
      notDeleted(deliveries),
    ];

    if (excludeDeliveryId) {
      conditions.push(ne(deliveries.id, excludeDeliveryId));
    }

    const rows = await tx
      .select({
        customOrderItemId: deliveryItems.customOrderItemId,
        netDelivered: netExpr,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .where(and(...conditions))
      .groupBy(deliveryItems.customOrderItemId);

    const netByItemId = new Map<number, number>();
    for (const row of rows) {
      if (!row.customOrderItemId) continue;
      netByItemId.set(row.customOrderItemId, Number(row.netDelivered ?? 0));
    }

    for (const [itemId, requested] of customRequested) {
      const delivered = netByItemId.get(itemId) ?? 0;
      if (requested > delivered) {
        ensureReturnQuantityExceeded();
      }
    }
  }
}

function ensureDeliveryQuantityExceedsStock(details: Record<string, ValidationFieldError>): never {
  failValidation(details);
}

async function assertDeliveryQuantitiesWithinStockTx(
  items: DeliveryMutationInput["items"],
  standardRows: Array<{
    id: number;
    productId: number | null;
    stockQuantity: number;
  }>,
) {
  const rowByItemId = new Map(standardRows.map((row) => [row.id, row]));
  const requestedByProduct = new Map<number, number>();

  for (const item of items) {
    if (!item.orderItemId) continue;
    const row = rowByItemId.get(item.orderItemId);
    if (!row?.productId) continue;

    requestedByProduct.set(
      row.productId,
      (requestedByProduct.get(row.productId) ?? 0) + item.deliveredQuantity,
    );
  }

  const exceededProductIds = new Set<number>();
  for (const row of standardRows) {
    if (!row.productId) continue;
    const requested = requestedByProduct.get(row.productId) ?? 0;
    if (requested > row.stockQuantity) {
      exceededProductIds.add(row.productId);
    }
  }

  if (exceededProductIds.size === 0) return;

  const fieldErrors: Record<string, ValidationFieldError> = {};
  items.forEach((item, index) => {
    if (!item.orderItemId) return;
    const row = rowByItemId.get(item.orderItemId);
    if (!row?.productId) return;
    if (exceededProductIds.has(row.productId)) {
      fieldErrors[`items.${index}.deliveredQuantity`] = {
        i18n: { ns: "validation", key: "insufficientStock" },
      };
    }
  });

  ensureDeliveryQuantityExceedsStock(fieldErrors);
}

async function getDeliveryAffectedOrderIdsTx(
  tx: DbTransaction,
  deliveryId: number,
): Promise<Set<number>> {
  const standardRows = await tx
    .select({
      orderId: orderItems.orderId,
    })
    .from(deliveryItems)
    .innerJoin(orderItems, eq(orderItems.id, deliveryItems.orderItemId))
    .where(
      and(
        eq(deliveryItems.deliveryId, deliveryId),
        notDeleted(deliveryItems),
        notDeleted(orderItems),
      ),
    );

  const customRows = await tx
    .select({
      orderId: customOrderItems.orderId,
    })
    .from(deliveryItems)
    .innerJoin(
      customOrderItems,
      eq(customOrderItems.id, deliveryItems.customOrderItemId),
    )
    .where(
      and(
        eq(deliveryItems.deliveryId, deliveryId),
        notDeleted(deliveryItems),
        notDeleted(customOrderItems),
      ),
    );

  return new Set([
    ...standardRows.map((row) => row.orderId),
    ...customRows.map((row) => row.orderId),
  ]);
}

export async function getDeliveryOrderOptions(): Promise<Array<DeliveryOrderOption>> {
  const [orderRows, standardItemRows, customItemRows, standardMovements, customMovements] =
    await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
        })
        .from(orders)
        .where(
          and(
            notDeleted(orders),
            inArray(orders.status, ["HAZIR", "KISMEN HAZIR"]),
          ),
        )
        .orderBy(desc(orders.orderDate), desc(orders.id)),
      db
      .select({
        id: orderItems.id,
        productId: products.id,
        orderId: orderItems.orderId,
        quantity: orderItems.quantity,
        unit: products.unit,
        unitPrice: orderItems.unitPrice,
        currency: orderItems.currency,
          stockQuantity: products.stockQuantity,
          productCode: products.code,
          productName: products.name,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .where(and(notDeleted(orderItems), notDeleted(products))),
      db
        .select({
          id: customOrderItems.id,
          orderId: customOrderItems.orderId,
          name: customOrderItems.name,
          quantity: customOrderItems.quantity,
          unit: customOrderItems.unit,
          unitPrice: customOrderItems.unitPrice,
          currency: customOrderItems.currency,
          notes: customOrderItems.notes,
        })
        .from(customOrderItems)
        .where(notDeleted(customOrderItems)),
      db
        .select({
          id: deliveryItems.id,
          orderItemId: deliveryItems.orderItemId,
          deliveredQuantity: deliveryItems.deliveredQuantity,
          kind: deliveries.kind,
        })
        .from(deliveryItems)
        .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
        .where(and(notDeleted(deliveryItems), notDeleted(deliveries))),
      db
        .select({
          id: deliveryItems.id,
          customOrderItemId: deliveryItems.customOrderItemId,
          deliveredQuantity: deliveryItems.deliveredQuantity,
          kind: deliveries.kind,
        })
        .from(deliveryItems)
        .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
        .where(and(notDeleted(deliveryItems), notDeleted(deliveries))),
    ]);

  const standardMovementsByItem = new Map<
    number,
    Array<{ id: number; deliveredQuantity: number; kind: DeliveryKind }>
  >();
  for (const movement of standardMovements) {
    if (!movement.orderItemId) continue;
    const list = standardMovementsByItem.get(movement.orderItemId) ?? [];
    list.push({
      id: movement.id,
      deliveredQuantity: movement.deliveredQuantity,
      kind: movement.kind,
    });
    standardMovementsByItem.set(movement.orderItemId, list);
  }

  const customMovementsByItem = new Map<
    number,
    Array<{ id: number; deliveredQuantity: number; kind: DeliveryKind }>
  >();
  for (const movement of customMovements) {
    if (!movement.customOrderItemId) continue;
    const list = customMovementsByItem.get(movement.customOrderItemId) ?? [];
    list.push({
      id: movement.id,
      deliveredQuantity: movement.deliveredQuantity,
      kind: movement.kind,
    });
    customMovementsByItem.set(movement.customOrderItemId, list);
  }

  const standardItemsByOrder = new Map<number, DeliveryOrderOption["items"]>();
  for (const row of standardItemRows) {
    const list = standardItemsByOrder.get(row.orderId) ?? [];
    list.push({
      id: row.id,
      productId: row.productId,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      currency: row.currency,
      stockQuantity: row.stockQuantity,
      product: {
        code: row.productCode,
        name: row.productName,
      },
      deliveries: (standardMovementsByItem.get(row.id) ?? []).map((movement) => ({
        id: movement.id,
        deliveredQuantity: movement.deliveredQuantity,
        delivery: {
          kind: movement.kind,
        },
      })),
    });
    standardItemsByOrder.set(row.orderId, list);
  }

  const customItemsByOrder = new Map<number, DeliveryOrderOption["customItems"]>();
  for (const row of customItemRows) {
    const list = customItemsByOrder.get(row.orderId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      currency: row.currency,
      notes: row.notes,
      deliveries: (customMovementsByItem.get(row.id) ?? []).map((movement) => ({
        id: movement.id,
        deliveredQuantity: movement.deliveredQuantity,
        delivery: {
          kind: movement.kind,
        },
      })),
    });
    customItemsByOrder.set(row.orderId, list);
  }

  return orderRows
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      items: standardItemsByOrder.get(order.id) ?? [],
      customItems: customItemsByOrder.get(order.id) ?? [],
    }))
    .filter((order) => order.items.length > 0 || order.customItems.length > 0);
}

export async function getDeliveryById({
  data,
}: ServerFnPayload<{ id: number }>): Promise<DeliveryDetail | null> {
  const id = Number(data?.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  const [deliveryRow] = await db
    .select({
      id: deliveries.id,
      customerId: deliveries.customerId,
      customerCode: customers.code,
      customerName: customers.name,
      deliveryNumber: deliveries.deliveryNumber,
      deliveryDate: deliveries.deliveryDate,
      kind: deliveries.kind,
      notes: deliveries.notes,
    })
    .from(deliveries)
    .leftJoin(customers, eq(customers.id, deliveries.customerId))
    .where(and(eq(deliveries.id, id), notDeleted(deliveries)))
    .limit(1);

  if (!deliveryRow) return null;

  const [standardItems, customItems] = await Promise.all([
    db
      .select({
        id: deliveryItems.id,
        orderId: orderItems.orderId,
        orderNumber: orders.orderNumber,
        orderItemId: orderItems.id,
        customOrderItemId: sql<number | null>`null`,
        productId: products.id,
        productCode: products.code,
        productName: products.name,
        unit: products.unit,
        price: orderItems.unitPrice,
        currency: orderItems.currency,
        stockQuantity: products.stockQuantity,
        deliveredQuantity: deliveryItems.deliveredQuantity,
        remainingQuantity: sql<number>`
          case
            when ${deliveries.kind} = 'RETURN'
              then greatest(
                coalesce(
                  (
                    select sum(
                      case
                        when d.kind = 'RETURN' then -di.delivered_quantity
                        else di.delivered_quantity
                      end
                    )
                    from delivery_items di
                    inner join deliveries d on d.id = di.delivery_id
                    where di.order_item_id = ${orderItems.id}
                      and di.deleted_at is null
                      and d.deleted_at is null
                      and d.id <> ${id}
                  ),
                  0
                ),
                0
              )
            else greatest(
              ${orderItems.quantity} - coalesce(
                (
                  select sum(
                    case
                      when d.kind = 'RETURN' then -di.delivered_quantity
                      else di.delivered_quantity
                    end
                  )
                  from delivery_items di
                  inner join deliveries d on d.id = di.delivery_id
                  where di.order_item_id = ${orderItems.id}
                    and di.deleted_at is null
                    and d.deleted_at is null
                    and d.id <> ${id}
                ),
                0
              ),
              0
            )
          end::int
        `,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .innerJoin(orderItems, eq(orderItems.id, deliveryItems.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(
        and(
          eq(deliveryItems.deliveryId, id),
          notDeleted(deliveryItems),
          notDeleted(orderItems),
          notDeleted(orders),
          notDeleted(products),
          notDeleted(deliveries),
        ),
      ),
    db
      .select({
        id: deliveryItems.id,
        orderId: customOrderItems.orderId,
        orderNumber: orders.orderNumber,
        orderItemId: sql<number | null>`null`,
        customOrderItemId: customOrderItems.id,
        productId: sql<number | null>`null`,
        productCode: customOrderItems.name,
        productName: sql<string>`coalesce(${customOrderItems.notes}, ${customOrderItems.name})`,
        unit: customOrderItems.unit,
        price: customOrderItems.unitPrice,
        currency: customOrderItems.currency,
        stockQuantity: sql<number | null>`null`,
        deliveredQuantity: deliveryItems.deliveredQuantity,
        remainingQuantity: sql<number>`
          case
            when ${deliveries.kind} = 'RETURN'
              then greatest(
                coalesce(
                  (
                    select sum(
                      case
                        when d.kind = 'RETURN' then -di.delivered_quantity
                        else di.delivered_quantity
                      end
                    )
                    from delivery_items di
                    inner join deliveries d on d.id = di.delivery_id
                    where di.custom_order_item_id = ${customOrderItems.id}
                      and di.deleted_at is null
                      and d.deleted_at is null
                      and d.id <> ${id}
                  ),
                  0
                ),
                0
              )
            else greatest(
              ${customOrderItems.quantity} - coalesce(
                (
                  select sum(
                    case
                      when d.kind = 'RETURN' then -di.delivered_quantity
                      else di.delivered_quantity
                    end
                  )
                  from delivery_items di
                  inner join deliveries d on d.id = di.delivery_id
                  where di.custom_order_item_id = ${customOrderItems.id}
                    and di.deleted_at is null
                    and d.deleted_at is null
                    and d.id <> ${id}
                ),
                0
              ),
              0
            )
          end::int
        `,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .innerJoin(
        customOrderItems,
        eq(customOrderItems.id, deliveryItems.customOrderItemId),
      )
      .innerJoin(orders, eq(orders.id, customOrderItems.orderId))
      .where(
        and(
          eq(deliveryItems.deliveryId, id),
          notDeleted(deliveryItems),
          notDeleted(customOrderItems),
          notDeleted(orders),
          notDeleted(deliveries),
        ),
      ),
  ]);

  return {
    ...deliveryRow,
    items: [...standardItems, ...customItems],
  };
}

export async function getDeliveryLabelExport({
  data,
}: ServerFnPayload<{ id: number }>): Promise<DeliveryLabelExportResult | null> {
  const id = Number(data?.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  const [deliveryRow] = await db
    .select({
      deliveryNumber: deliveries.deliveryNumber,
      kind: deliveries.kind,
    })
    .from(deliveries)
    .where(and(eq(deliveries.id, id), notDeleted(deliveries)))
    .limit(1);

  if (!deliveryRow) return null;

  const [standardRows, customRows] = await Promise.all([
    db
      .select({
        orderNumber: orders.orderNumber,
        deliveryAddress: sql<string>`coalesce(${orders.deliveryAddress}, '')`,
        productCode: sql<string>`coalesce(${products.code}, '')`,
        productName: sql<string>`
          coalesce(${products.name}, ${products.code}, '')
        `,
        deliveryQuantity: deliveryItems.deliveredQuantity,
        unit: sql<string>`coalesce(${products.unit}, 'adet')`,
        sortId: deliveryItems.id,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .innerJoin(orderItems, eq(orderItems.id, deliveryItems.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(
        and(
          eq(deliveryItems.deliveryId, id),
          notDeleted(deliveryItems),
          notDeleted(deliveries),
          notDeleted(orderItems),
          notDeleted(orders),
        ),
      ),
    db
      .select({
        orderNumber: orders.orderNumber,
        deliveryAddress: sql<string>`coalesce(${orders.deliveryAddress}, '')`,
        productCode: sql<string>`coalesce(${customOrderItems.name}, '')`,
        productName: sql<string>`
          coalesce(${customOrderItems.notes}, ${customOrderItems.name}, '')
        `,
        deliveryQuantity: deliveryItems.deliveredQuantity,
        unit: sql<string>`coalesce(${customOrderItems.unit}, 'adet')`,
        sortId: deliveryItems.id,
      })
      .from(deliveryItems)
      .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
      .innerJoin(
        customOrderItems,
        eq(customOrderItems.id, deliveryItems.customOrderItemId),
      )
      .innerJoin(orders, eq(orders.id, customOrderItems.orderId))
      .where(
        and(
          eq(deliveryItems.deliveryId, id),
          notDeleted(deliveryItems),
          notDeleted(deliveries),
          notDeleted(customOrderItems),
          notDeleted(orders),
        ),
      ),
  ]);

  const rows: Array<DeliveryLabelExportRow> = [...standardRows, ...customRows];

  rows.sort(
    (left, right) =>
      left.orderNumber.localeCompare(right.orderNumber, "tr", {
        numeric: true,
        sensitivity: "base",
      }) || left.sortId - right.sortId,
  );

  return {
    deliveryNumber: deliveryRow.deliveryNumber,
    kind: deliveryRow.kind,
    rows: rows.map(({ sortId: _sortId, ...row }) => row),
  };
}

export async function createDelivery({
  data,
}: ServerFnPayload<unknown>): Promise<DeliveryDetail | null> {
  const user = await requireAuth();
  const input = parseDeliveryMutationInput(data);
  validateDeliveryMutationInput(input);

  const createdDelivery = await db.transaction(async (tx) => {
    const customerRows = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, input.customerId!), notDeleted(customers)))
      .limit(1);
    if (!customerRows[0]) {
      failValidation({
        customerId: { i18n: { ns: "validation", key: "invalid" } },
      });
    }

    const standardItemIds = input.items
      .map((item) => item.orderItemId ?? 0)
      .filter((id) => id > 0);
    const customItemIds = input.items
      .map((item) => item.customOrderItemId ?? 0)
      .filter((id) => id > 0);

    if (new Set(standardItemIds).size !== standardItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }
    if (new Set(customItemIds).size !== customItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }

    const standardRows = standardItemIds.length > 0
      ? await tx
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            customerId: orders.customerId,
            productId: orderItems.productId,
            stockQuantity: products.stockQuantity,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .innerJoin(products, eq(products.id, orderItems.productId))
          .where(
            and(
              inArray(orderItems.id, standardItemIds),
              notDeleted(orderItems),
              notDeleted(orders),
              notDeleted(products),
            ),
          )
      : [];

    const customRows = customItemIds.length > 0
      ? await tx
          .select({
            id: customOrderItems.id,
            orderId: customOrderItems.orderId,
            customerId: orders.customerId,
          })
          .from(customOrderItems)
          .innerJoin(orders, eq(orders.id, customOrderItems.orderId))
          .where(
            and(
              inArray(customOrderItems.id, customItemIds),
              notDeleted(customOrderItems),
              notDeleted(orders),
            ),
          )
      : [];

    if (standardRows.length !== standardItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }
    if (customRows.length !== customItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }

    const orderIds = new Set<number>();
    for (const row of standardRows) {
      if (row.customerId !== input.customerId) {
        failValidation({
          customerId: { i18n: { ns: "validation", key: "invalid" } },
        });
      }
      orderIds.add(row.orderId);
    }
    for (const row of customRows) {
      if (row.customerId !== input.customerId) {
        failValidation({
          customerId: { i18n: { ns: "validation", key: "invalid" } },
        });
      }
      orderIds.add(row.orderId);
    }

    if (input.kind === "RETURN") {
      await assertReturnQuantitiesWithinDeliveredTx(tx, input.items);
    } else {
      await assertDeliveryQuantitiesWithinStockTx(input.items, standardRows);
    }

    const [delivery] = await tx
      .insert(deliveries)
      .values({
        customerId: input.customerId!,
        deliveryNumber: input.deliveryNumber!.trim(),
        deliveryDate: input.deliveryDate!,
        kind: input.kind ?? "DELIVERY",
        notes: input.notes ?? null,
      })
      .returning();

    await tx.insert(deliveryItems).values(
      input.items.map((item) => ({
        deliveryId: delivery.id,
        orderItemId: item.orderItemId ?? null,
        customOrderItemId: item.customOrderItemId ?? null,
        deliveredQuantity: item.deliveredQuantity,
      })),
    );

    const increasedStockProductIds = new Set<number>();

    if (standardRows.length > 0) {
      const standardRowById = new Map(standardRows.map((row) => [row.id, row]));
      for (const item of input.items) {
        if (!item.orderItemId) continue;
        const row = standardRowById.get(item.orderItemId);
        if (!row?.productId) continue;

        const stockMovement = resolveDeliveryStockMovement(
          input.kind ?? "DELIVERY",
          item.deliveredQuantity,
        );

        await createDeliveryStockMovementTx(tx, {
          productId: row.productId,
          quantity: stockMovement.quantity,
          movementType: stockMovement.movementType,
          referenceId: delivery.id,
          createdBy: user.id,
          notes: `${stockMovement.notePrefix} #${delivery.deliveryNumber}`,
        });

        if (stockMovement.quantity > 0) {
          increasedStockProductIds.add(row.productId);
        }
      }
    }

    if (increasedStockProductIds.size > 0) {
      await syncReadyStatusesForProductsTx(tx, [...increasedStockProductIds]);
    }

    for (const orderId of orderIds) {
      await recalculateOrderStatusTx(tx, orderId);
    }

    return delivery.id;
  });

  return getDeliveryById({ data: { id: createdDelivery } });
}

export async function updateDelivery({
  data,
}: ServerFnPayload<{ id: number; data: unknown }>): Promise<DeliveryDetail | null> {
  const user = await requireAuth();
  const id = Number(data?.id);
  if (!Number.isInteger(id) || id <= 0) ensureDeliveryNotFound();

  const input = parseDeliveryMutationInput(data.data);
  validateDeliveryMutationInput(input);

  await db.transaction(async (tx) => {
    const [existingDelivery] = await tx
      .select({
        id: deliveries.id,
        kind: deliveries.kind,
      })
      .from(deliveries)
      .where(and(eq(deliveries.id, id), notDeleted(deliveries)))
      .limit(1);

    if (!existingDelivery) ensureDeliveryNotFound();
    if (input.kind && input.kind !== existingDelivery.kind) {
      ensureDeliveryKindChangeNotAllowed();
    }

    const customerRows = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, input.customerId!), notDeleted(customers)))
      .limit(1);
    if (!customerRows[0]) {
      failValidation({
        customerId: { i18n: { ns: "validation", key: "invalid" } },
      });
    }

    const oldAffectedOrderIds = await getDeliveryAffectedOrderIdsTx(tx, id);
    const increasedStockProductIds = new Set<number>(
      await removeDeliveryStockMovementsTx(tx, id),
    );

    await tx
      .update(deliveryItems)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(deliveryItems.deliveryId, id), notDeleted(deliveryItems)));

    const standardItemIds = input.items
      .map((item) => item.orderItemId ?? 0)
      .filter((itemId) => itemId > 0);
    const customItemIds = input.items
      .map((item) => item.customOrderItemId ?? 0)
      .filter((itemId) => itemId > 0);

    if (new Set(standardItemIds).size !== standardItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }
    if (new Set(customItemIds).size !== customItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }

    const standardRows = standardItemIds.length > 0
      ? await tx
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            customerId: orders.customerId,
            productId: orderItems.productId,
            stockQuantity: products.stockQuantity,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .innerJoin(products, eq(products.id, orderItems.productId))
          .where(
            and(
              inArray(orderItems.id, standardItemIds),
              notDeleted(orderItems),
              notDeleted(orders),
              notDeleted(products),
            ),
          )
      : [];

    const customRows = customItemIds.length > 0
      ? await tx
          .select({
            id: customOrderItems.id,
            orderId: customOrderItems.orderId,
            customerId: orders.customerId,
          })
          .from(customOrderItems)
          .innerJoin(orders, eq(orders.id, customOrderItems.orderId))
          .where(
            and(
              inArray(customOrderItems.id, customItemIds),
              notDeleted(customOrderItems),
              notDeleted(orders),
            ),
          )
      : [];

    if (standardRows.length !== standardItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }
    if (customRows.length !== customItemIds.length) {
      failValidation({ items: { i18n: { ns: "validation", key: "invalid" } } });
    }

    const affectedOrderIds = new Set(oldAffectedOrderIds);
    for (const row of standardRows) {
      if (row.customerId !== input.customerId) {
        failValidation({
          customerId: { i18n: { ns: "validation", key: "invalid" } },
        });
      }
      affectedOrderIds.add(row.orderId);
    }
    for (const row of customRows) {
      if (row.customerId !== input.customerId) {
        failValidation({
          customerId: { i18n: { ns: "validation", key: "invalid" } },
        });
      }
      affectedOrderIds.add(row.orderId);
    }

    if (existingDelivery.kind === "RETURN") {
      await assertReturnQuantitiesWithinDeliveredTx(tx, input.items, id);
    } else {
      await assertDeliveryQuantitiesWithinStockTx(input.items, standardRows);
    }

    await tx
      .update(deliveries)
      .set({
        customerId: input.customerId!,
        deliveryNumber: input.deliveryNumber!.trim(),
        deliveryDate: input.deliveryDate!,
        notes: input.notes ?? null,
        updatedAt: sql`now()`,
      })
      .where(eq(deliveries.id, id));

    await tx.insert(deliveryItems).values(
      input.items.map((item) => ({
        deliveryId: id,
        orderItemId: item.orderItemId ?? null,
        customOrderItemId: item.customOrderItemId ?? null,
        deliveredQuantity: item.deliveredQuantity,
      })),
    );

    const standardRowById = new Map(standardRows.map((row) => [row.id, row]));
    for (const item of input.items) {
      if (!item.orderItemId) continue;
      const row = standardRowById.get(item.orderItemId);
      if (!row?.productId) continue;

      const stockMovement = resolveDeliveryStockMovement(
        existingDelivery.kind,
        item.deliveredQuantity,
      );

      await createDeliveryStockMovementTx(tx, {
        productId: row.productId,
        quantity: stockMovement.quantity,
        movementType: stockMovement.movementType,
        referenceId: id,
        createdBy: user.id,
        notes: `${stockMovement.notePrefix} update #${input.deliveryNumber!.trim()}`,
      });

      if (stockMovement.quantity > 0) {
        increasedStockProductIds.add(row.productId);
      }
    }

    if (increasedStockProductIds.size > 0) {
      await syncReadyStatusesForProductsTx(tx, [...increasedStockProductIds]);
    }

    for (const orderId of affectedOrderIds) {
      await recalculateOrderStatusTx(tx, orderId);
    }
  });

  return getDeliveryById({ data: { id } });
}

export async function removeDelivery({
  data,
}: ServerFnPayload<{ id: number }>): Promise<DeliveryMutationResult> {
  await requireAuth();

  const id = Number(data?.id);
  if (!Number.isInteger(id) || id <= 0) ensureDeliveryNotFound();

  await db.transaction(async (tx) => {
    const [delivery] = await tx
      .select({ id: deliveries.id })
      .from(deliveries)
      .where(and(eq(deliveries.id, id), notDeleted(deliveries)))
      .limit(1);

    if (!delivery) ensureDeliveryNotFound();

    const affectedOrderIds = await getDeliveryAffectedOrderIdsTx(tx, id);
    const increasedStockProductIds = await removeDeliveryStockMovementsTx(tx, id);

    if (increasedStockProductIds.length > 0) {
      await syncReadyStatusesForProductsTx(tx, increasedStockProductIds);
    }

    await tx
      .update(deliveryItems)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(deliveryItems.deliveryId, id), notDeleted(deliveryItems)));

    await tx
      .update(deliveries)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(deliveries.id, id), notDeleted(deliveries)));

    for (const orderId of affectedOrderIds) {
      await recalculateOrderStatusTx(tx, orderId);
    }
  });

  return { success: true };
}

export async function getDeliveryHistory({
  data,
}: ServerFnPayload<{ id: number }>): Promise<DeliveryHistoryResult> {
  const id = Number(data?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return {
      deliveryNumber: "",
      kind: "DELIVERY",
      items: [],
    };
  }

  const [currentDelivery] = await db
    .select({
      id: deliveries.id,
      kind: deliveries.kind,
      deliveryNumber: deliveries.deliveryNumber,
    })
    .from(deliveries)
    .where(and(eq(deliveries.id, id), notDeleted(deliveries)))
    .limit(1);

  if (!currentDelivery) {
    return {
      deliveryNumber: "",
      kind: "DELIVERY",
      items: [],
    };
  }

  const [standardCurrentItems, customCurrentItems] = await Promise.all([
    db
      .select({
        id: deliveryItems.id,
        orderItemId: orderItems.id,
        currentDeliveredQuantity: deliveryItems.deliveredQuantity,
        orderedQuantity: orderItems.quantity,
        orderNumber: orders.orderNumber,
        productCode: products.code,
        productName: products.name,
      })
      .from(deliveryItems)
      .innerJoin(orderItems, eq(orderItems.id, deliveryItems.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(
        and(
          eq(deliveryItems.deliveryId, id),
          notDeleted(deliveryItems),
          notDeleted(orderItems),
          notDeleted(orders),
          notDeleted(products),
        ),
      ),
    db
      .select({
        id: deliveryItems.id,
        customOrderItemId: customOrderItems.id,
        currentDeliveredQuantity: deliveryItems.deliveredQuantity,
        orderedQuantity: customOrderItems.quantity,
        orderNumber: orders.orderNumber,
        productCode: customOrderItems.name,
        productName: customOrderItems.name,
      })
      .from(deliveryItems)
      .innerJoin(
        customOrderItems,
        eq(customOrderItems.id, deliveryItems.customOrderItemId),
      )
      .innerJoin(orders, eq(orders.id, customOrderItems.orderId))
      .where(
        and(
          eq(deliveryItems.deliveryId, id),
          notDeleted(deliveryItems),
          notDeleted(customOrderItems),
          notDeleted(orders),
        ),
      ),
  ]);

  const standardOrderItemIds = standardCurrentItems
    .map((item) => item.orderItemId)
    .filter((orderItemId): orderItemId is number => orderItemId > 0);
  const customOrderItemIds = customCurrentItems
    .map((item) => item.customOrderItemId)
    .filter((customOrderItemId): customOrderItemId is number => customOrderItemId > 0);

  const [standardMovements, customMovements] = await Promise.all([
    standardOrderItemIds.length > 0
      ? db
          .select({
            id: deliveryItems.id,
            orderItemId: deliveryItems.orderItemId,
            deliveredQuantity: deliveryItems.deliveredQuantity,
            deliveryNumber: deliveries.deliveryNumber,
            deliveryDate: deliveries.deliveryDate,
            kind: deliveries.kind,
          })
          .from(deliveryItems)
          .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
          .where(
            and(
              inArray(deliveryItems.orderItemId, standardOrderItemIds),
              ne(deliveryItems.deliveryId, id),
              notDeleted(deliveryItems),
              notDeleted(deliveries),
            ),
          )
      : Promise.resolve([]),
    customOrderItemIds.length > 0
      ? db
          .select({
            id: deliveryItems.id,
            customOrderItemId: deliveryItems.customOrderItemId,
            deliveredQuantity: deliveryItems.deliveredQuantity,
            deliveryNumber: deliveries.deliveryNumber,
            deliveryDate: deliveries.deliveryDate,
            kind: deliveries.kind,
          })
          .from(deliveryItems)
          .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
          .where(
            and(
              inArray(deliveryItems.customOrderItemId, customOrderItemIds),
              ne(deliveryItems.deliveryId, id),
              notDeleted(deliveryItems),
              notDeleted(deliveries),
            ),
          )
      : Promise.resolve([]),
  ]);

  const standardMovementsByItemId = new Map<number, Array<DeliveryHistoryMovement>>();
  for (const movement of standardMovements) {
    if (!movement.orderItemId) continue;
    const movementList = standardMovementsByItemId.get(movement.orderItemId) ?? [];
    movementList.push({
      id: movement.id,
      deliveredQuantity: movement.deliveredQuantity,
      deliveryNumber: movement.deliveryNumber,
      deliveryDate: movement.deliveryDate,
      kind: movement.kind,
    });
    standardMovementsByItemId.set(movement.orderItemId, movementList);
  }

  const customMovementsByItemId = new Map<number, Array<DeliveryHistoryMovement>>();
  for (const movement of customMovements) {
    if (!movement.customOrderItemId) continue;
    const movementList = customMovementsByItemId.get(movement.customOrderItemId) ?? [];
    movementList.push({
      id: movement.id,
      deliveredQuantity: movement.deliveredQuantity,
      deliveryNumber: movement.deliveryNumber,
      deliveryDate: movement.deliveryDate,
      kind: movement.kind,
    });
    customMovementsByItemId.set(movement.customOrderItemId, movementList);
  }

  const items: Array<DeliveryHistoryItem> = [
    ...standardCurrentItems.map((item) => ({
      id: item.id,
      itemType: "standard" as const,
      orderNumber: item.orderNumber,
      productCode: item.productCode,
      productName: item.productName,
      orderedQuantity: item.orderedQuantity,
      currentDeliveredQuantity: item.currentDeliveredQuantity,
      movements:
        standardMovementsByItemId
          .get(item.orderItemId)
          ?.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)) ?? [],
    })),
    ...customCurrentItems.map((item) => ({
      id: item.id,
      itemType: "custom" as const,
      orderNumber: item.orderNumber,
      productCode: item.productCode,
      productName: item.productName,
      orderedQuantity: item.orderedQuantity,
      currentDeliveredQuantity: item.currentDeliveredQuantity,
      movements:
        customMovementsByItemId
          .get(item.customOrderItemId)
          ?.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)) ?? [],
    })),
  ];

  return {
    deliveryNumber: currentDelivery.deliveryNumber,
    kind: currentDelivery.kind,
    items,
  };
}

export type { DeliveriesSearch };
