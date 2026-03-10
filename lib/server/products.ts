import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import {
  productsSearchSchema,
  type ProductsSearch,
} from "@/lib/types/search";
import { TR } from "@/lib/constants";
import { db } from "@/db";
import { customers, products, stockMovements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { syncReadyStatusesForProductsTx } from "@/lib/server/orders";
import {
  normalizeCode,
  normalizeMaterial,
  normalizeParams,
  normalizeProcess,
  normalizeText,
  notDeleted,
  toNullableText,
  toOptionalPositiveInt,
} from "@/lib/server/normalize";
import {
  parseProductInput,
  parseProductStockAction,
  type ProductInput,
} from "@/lib/validators/mutations";
import {
  toCurrencyOrDefault,
  toUnitOrDefault,
} from "@/lib/types/domain";

type ServerFnPayload<TData> = { data: TData };
const productIdSchema = z.object({ id: z.number().int().positive() });

type ValidationFieldError = {
  i18n: {
    ns: "validation";
    key: "required" | "invalid";
  };
};

function ensureAuthError(): never {
  throw new AppError("AUTH_REQUIRED");
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) ensureAuthError();
  return user;
}

function failValidation(details: Record<string, ValidationFieldError>): never {
  throw new AppError("VALIDATION_ERROR", "Invalid request data.", { details });
}

export function validateProduct(product: ProductInput) {
  const fieldErrors: Record<string, ValidationFieldError> = {};

  if (!product.code?.trim()) {
    fieldErrors.code = { i18n: { ns: "validation", key: "required" } };
  }
  if (!product.name?.trim()) {
    fieldErrors.name = { i18n: { ns: "validation", key: "required" } };
  }
  if (!product.customerId || product.customerId <= 0) {
    fieldErrors.customerId = { i18n: { ns: "validation", key: "invalid" } };
  }

  if (Object.keys(fieldErrors).length > 0) {
    failValidation(fieldErrors);
  }
}

export function editProductBeforeInsert(product: ProductInput) {
  const code = normalizeCode(product.code);
  if (code) product.code = code;

  const name = normalizeText(product.name);
  if (name) {
    product.name = name[0].toLocaleUpperCase(TR) + name.slice(1);
  }

  if (product.otherCodes != null) {
    product.otherCodes = normalizeText(product.otherCodes);
  }
  if (product.notes != null) {
    product.notes = normalizeText(product.notes);
  }
  if (product.material != null) {
    product.material = normalizeMaterial(product.material);
  }
  if (product.coating != null) {
    product.coating = normalizeText(product.coating);
  }
  if (product.postProcess != null) {
    product.postProcess = normalizeProcess(product.postProcess);
  }
  if (product.specs != null) {
    product.specs = normalizeText(product.specs);
  }
  if (product.specsNet != null) {
    product.specsNet = normalizeText(product.specsNet);
  }
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createStockMovementTx(
  tx: DbTransaction,
  input: {
    productId: number;
    quantity: number;
    movementType: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
    referenceType: "adjustment" | "transfer";
    referenceId: number;
    createdBy: number;
    notes?: string | null;
  },
) {
  await tx.insert(stockMovements).values({
    productId: input.productId,
    quantity: input.quantity,
    movementType: input.movementType,
    referenceType: input.referenceType,
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

  if (input.quantity > 0) {
    await syncReadyStatusesForProductsTx(tx, [input.productId]);
  }
}

async function createTransferStockMovementsTx(
  tx: DbTransaction,
  input: {
    sourceProductId: number;
    targetProductId: number;
    quantity: number;
    createdBy: number;
    notes?: string | null;
  },
) {
  const [sourceMovement] = await tx
    .insert(stockMovements)
    .values({
      productId: input.sourceProductId,
      quantity: -input.quantity,
      movementType: "TRANSFER",
      referenceType: "transfer",
      referenceId: 0,
      createdBy: input.createdBy,
      notes: input.notes ?? null,
    })
    .returning({ id: stockMovements.id });

  await tx
    .update(stockMovements)
    .set({
      referenceId: sourceMovement.id,
      updatedAt: sql`now()`,
    })
    .where(eq(stockMovements.id, sourceMovement.id));

  await tx.insert(stockMovements).values({
    productId: input.targetProductId,
    quantity: input.quantity,
    movementType: "TRANSFER",
    referenceType: "transfer",
    referenceId: sourceMovement.id,
    createdBy: input.createdBy,
    notes: input.notes ?? null,
  });

  await tx
    .update(products)
    .set({
      stockQuantity: sql`${products.stockQuantity} - ${input.quantity}`,
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, input.sourceProductId));

  await tx
    .update(products)
    .set({
      stockQuantity: sql`${products.stockQuantity} + ${input.quantity}`,
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, input.targetProductId));

  await syncReadyStatusesForProductsTx(tx, [input.targetProductId]);
}

function ensureProductNotFound(): never {
  throw new AppError("PRODUCT_NOT_FOUND");
}

function ensureInsufficientStock(): never {
  throw new AppError("INSUFFICIENT_STOCK");
}

function ensureProductHasStock(): never {
  throw new AppError("PRODUCT_HAS_STOCK");
}

export async function getPaginatedProducts({
  data,
}: ServerFnPayload<ProductsSearch>) {
  const parsed = productsSearchSchema.parse(data);
  const {
    pageIndex,
    pageSize,
    q,
    sortBy = "code",
    sortDir = "asc",
    material,
    customerId,
  } = parsed;

  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.min(Math.max(10, pageSize), 200);
  const normalizedQ = normalizeParams(q);
  const normalizedMaterial = normalizeParams(material);
  const normalizedCustomerId = normalizeParams(customerId);

  const conditions: Array<SQL> = [notDeleted(products)];

  // Search filter
  if (normalizedQ) {
    const search = `%${normalizedQ}%`;
    conditions.push(
      or(
        ilike(products.code, search),
        ilike(products.name, search),
        ilike(products.material, search),
        ilike(products.otherCodes, search),
        ilike(products.notes, search),
        ilike(products.coating, search),
      )!,
    );
  }

  // Material filter
  if (normalizedMaterial) {
    const values = normalizedMaterial
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

    if (values.length > 1) {
      conditions.push(inArray(products.material, values));
    } else if (values.length === 1) {
      conditions.push(eq(products.material, values[0]));
    }
  }

  // Customer filter
  if (normalizedCustomerId) {
    const ids = normalizedCustomerId
      .split("|")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length > 1) {
      conditions.push(inArray(products.customerId, ids));
    } else if (ids.length === 1) {
      conditions.push(eq(products.customerId, ids[0]));
    }
  }

  const whereExpr: SQL =
    conditions.length === 1 ? conditions[0] : and(...conditions)!;

  const rankingExpr = normalizedQ
    ? sql<number>`
        (
          CASE
            WHEN ${products.code} = ${normalizedQ} THEN 1000
            ELSE 0
          END
          +
          CASE
            WHEN ${products.code} ILIKE ${`${normalizedQ}%`} THEN 200
            ELSE 0
          END
          +
          CASE
            WHEN ${products.code} ILIKE ${`%${normalizedQ}%`} THEN 80
            ELSE 0
          END
          +
          CASE
            WHEN ${products.name} ILIKE ${`${normalizedQ}%`} THEN 120
            ELSE 0
          END
          +
          CASE
            WHEN ${products.name} ILIKE ${`%${normalizedQ}%`} THEN 50
            ELSE 0
          END
          +
          CASE
            WHEN ${products.material} ILIKE ${`%${normalizedQ}%`} THEN 20
            ELSE 0
          END
          +
          CASE
            WHEN ${products.otherCodes} ILIKE ${`%${normalizedQ}%`}
            THEN 30 ELSE 0
          END
          +
          CASE
            WHEN ${products.notes} ILIKE ${`%${normalizedQ}%`} THEN 10
            ELSE 0
          END
        )
      `
    : undefined;

  const dir = sortDir === "desc" ? desc : asc;
  const orderByExpr =
    normalizedQ && rankingExpr
      ? [desc(rankingExpr), asc(products.code), asc(products.id)]
      : (() => {
          switch (sortBy) {
            case "name":
              return [dir(products.name), asc(products.id)];
            case "price":
              return [dir(products.price), asc(products.id)];
            case "other_codes":
              return [dir(products.otherCodes), asc(products.id)];
            case "material":
              return [dir(products.material), asc(products.id)];
            case "post_process":
              return [dir(products.postProcess), asc(products.id)];
            case "coating":
              return [dir(products.coating), asc(products.id)];
            case "customer":
              return [dir(customers.name), desc(products.code), asc(products.id)];
            case "code":
            default:
              return [dir(products.code), asc(products.id)];
          }
        })();

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereExpr),

    db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        price: products.price,
        currency: products.currency,
        stockQuantity: products.stockQuantity,
        minStockLevel: products.minStockLevel,
        otherCodes: products.otherCodes,
        material: products.material,
        postProcess: products.postProcess,
        coating: products.coating,
        specs: products.specs,
        specsNet: products.specsNet,
        notes: products.notes,
        customerId: products.customerId,
        customerName: customers.name,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        deletedAt: products.deletedAt,
      })
      .from(products)
      .leftJoin(
        customers,
        and(eq(customers.id, products.customerId), notDeleted(customers)),
      )
      .where(whereExpr)
      .orderBy(...orderByExpr)
      .limit(safePageSize)
      .offset(safePageIndex * safePageSize),
  ]).catch((error) => {
    console.error("[getPaginatedProducts] query failed", {
      error,
      input: {
        pageIndex,
        pageSize,
        q,
        material,
        customerId,
        sortBy,
        sortDir,
      },
      normalized: {
        normalizedQ,
        normalizedMaterial,
        normalizedCustomerId,
        safePageIndex,
        safePageSize,
      },
    });
    throw error;
  });

  const total = totalResult[0]?.count ?? 0;

  return {
    data: rows,
    pageIndex: safePageIndex,
    pageSize: safePageSize,
    total,
    pageCount: Math.ceil(total / safePageSize),
  };
}

export const getPaginated = getPaginatedProducts;

export async function getProducts() {
  return db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      customerId: products.customerId,
    })
    .from(products)
    .where(notDeleted(products))
    .orderBy(asc(products.code), asc(products.id));
}

export async function getProductById({
  data,
}: ServerFnPayload<{ id: number }>) {
  const { id } = productIdSchema.parse(data);

  const rows = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      unit: products.unit,
      price: products.price,
      currency: products.currency,
      stockQuantity: products.stockQuantity,
      minStockLevel: products.minStockLevel,
      otherCodes: products.otherCodes,
      material: products.material,
      postProcess: products.postProcess,
      coating: products.coating,
      specs: products.specs,
      specsNet: products.specsNet,
      notes: products.notes,
      customerId: products.customerId,
      customerName: customers.name,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .leftJoin(
      customers,
      and(eq(customers.id, products.customerId), notDeleted(customers)),
    )
    .where(and(eq(products.id, id), notDeleted(products)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getProductFilterOptions() {
  const [materialRows, customerRows] = await Promise.all([
    db
      .selectDistinct({ material: products.material })
      .from(products)
      .where(and(notDeleted(products), sql`${products.material} is not null`))
      .orderBy(asc(products.material)),
    db
      .selectDistinct({
        id: customers.id,
        code: customers.code,
        name: customers.name,
      })
      .from(products)
      .innerJoin(customers, eq(customers.id, products.customerId))
      .where(and(notDeleted(products), notDeleted(customers)))
      .orderBy(asc(customers.code), asc(customers.id)),
  ]);

  return {
    materials: materialRows
      .map((row) => row.material)
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
    customers: customerRows,
  };
}

export async function createProduct({ data }: ServerFnPayload<unknown>) {
  const user = await requireAuth();
  const payload = parseProductInput(data);

  validateProduct(payload);
  editProductBeforeInsert(payload);

  return db.transaction(async (tx) => {
    const initialStock = Math.max(0, Math.trunc(payload.stockQuantity ?? 0));

    const [newProduct] = await tx
      .insert(products)
      .values({
        code: payload.code!,
        name: payload.name!,
        unit: toUnitOrDefault(payload.unit),
        price: Math.max(0, Math.trunc(payload.price ?? 0)),
        currency: toCurrencyOrDefault(payload.currency),
        stockQuantity: 0,
        minStockLevel: Math.max(0, Math.trunc(payload.minStockLevel ?? 0)),
        otherCodes: payload.otherCodes ?? null,
        material: payload.material ?? null,
        postProcess: payload.postProcess ?? null,
        coating: payload.coating ?? null,
        specs: payload.specs ?? null,
        specsNet: payload.specsNet ?? null,
        notes: payload.notes ?? null,
        customerId: payload.customerId!,
      })
      .returning();

    if (initialStock > 0) {
      await createStockMovementTx(tx, {
        productId: newProduct.id,
        quantity: initialStock,
        movementType: "IN",
        referenceType: "adjustment",
        referenceId: newProduct.id,
        createdBy: user.id,
        notes: "Initial stock",
      });
    }

    return newProduct;
  });
}

export async function adjustProductStock({
  data,
}: ServerFnPayload<{
  productId: number;
  quantity: number;
  notes?: string;
  actionType?: "IN" | "OUT" | "TRANSFER";
  targetProductId?: number;
}>) {
  const user = await requireAuth();
  const productId = toOptionalPositiveInt(data?.productId);
  const quantity = Math.trunc(Number(data?.quantity ?? 0));
  const notes = toNullableText(data?.notes);
  const actionType = data?.actionType;
  const targetProductId = toOptionalPositiveInt(data?.targetProductId);

  if (!productId || quantity === 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid request data.");
  }

  if (actionType === "TRANSFER") {
    if (!targetProductId || targetProductId === productId || quantity <= 0) {
      throw new AppError("VALIDATION_ERROR", "Invalid request data.");
    }

    return db.transaction(async (tx) => {
      const [sourceProduct, targetProduct] = await Promise.all([
        tx.query.products.findFirst({
          where: and(eq(products.id, productId), notDeleted(products)),
          columns: { id: true, stockQuantity: true },
        }),
        tx.query.products.findFirst({
          where: and(eq(products.id, targetProductId), notDeleted(products)),
          columns: { id: true },
        }),
      ]);

      if (!sourceProduct || !targetProduct) {
        ensureProductNotFound();
      }

      if (sourceProduct.stockQuantity < quantity) {
        ensureInsufficientStock();
      }

      await createTransferStockMovementsTx(tx, {
        sourceProductId: productId,
        targetProductId,
        quantity,
        createdBy: user.id,
        notes,
      });

      return { success: true };
    });
  }

  return db.transaction(async (tx) => {
    const existing = await tx.query.products.findFirst({
      where: and(eq(products.id, productId), notDeleted(products)),
      columns: { id: true, stockQuantity: true },
    });

    if (!existing) {
      ensureProductNotFound();
    }

    const signedQuantity =
      actionType === "OUT"
        ? -Math.abs(quantity)
        : actionType === "IN"
          ? Math.abs(quantity)
          : quantity;
    const movementType =
      actionType === "IN" || actionType === "OUT"
        ? actionType
        : signedQuantity < 0
          ? "OUT"
          : "IN";
    const nextStock = existing.stockQuantity + signedQuantity;
    if (nextStock < 0) {
      ensureInsufficientStock();
    }

    await createStockMovementTx(tx, {
      productId,
      quantity: signedQuantity,
      movementType,
      referenceType: "adjustment",
      referenceId: productId,
      createdBy: user.id,
      notes,
    });

    return { success: true };
  });
}

export async function updateProduct({ data }: ServerFnPayload<unknown>) {
  const root = data && typeof data === "object" ? data : {};
  const id = toOptionalPositiveInt(
    root && typeof root === "object" && "id" in root
      ? (root as { id?: unknown }).id
      : undefined,
  );
  if (!id) {
    throw new AppError("VALIDATION_ERROR", "Invalid request data.");
  }

  const user = await requireAuth();
  const patchSource =
    root && typeof root === "object" && "data" in root
      ? (root as { data?: unknown }).data
      : root;
  const patchSourceRecord =
    patchSource && typeof patchSource === "object"
      ? (patchSource as Record<string, unknown>)
      : {};
  const stockAction = parseProductStockAction(patchSourceRecord.stockAction);
  const stockActionType = stockAction?.type;
  const stockActionQuantity = stockAction?.quantity ?? 0;
  const stockActionNotes = stockAction?.notes ?? null;

  const payload = parseProductInput(patchSource);
  validateProduct(payload);
  editProductBeforeInsert(payload);

  const patch = {
    ...(payload.code !== undefined ? { code: payload.code } : {}),
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.unit !== undefined
      ? {
          unit: toUnitOrDefault(payload.unit),
        }
      : {}),
    ...(payload.price !== undefined
      ? { price: Math.max(0, Math.trunc(payload.price)) }
      : {}),
    ...(payload.currency !== undefined
      ? {
          currency: toCurrencyOrDefault(payload.currency),
        }
      : {}),
    ...(payload.minStockLevel !== undefined
      ? { minStockLevel: Math.max(0, Math.trunc(payload.minStockLevel)) }
      : {}),
    ...(payload.otherCodes !== undefined ? { otherCodes: payload.otherCodes } : {}),
    ...(payload.material !== undefined ? { material: payload.material } : {}),
    ...(payload.postProcess !== undefined
      ? { postProcess: payload.postProcess }
      : {}),
    ...(payload.coating !== undefined ? { coating: payload.coating } : {}),
    ...(payload.specs !== undefined ? { specs: payload.specs } : {}),
    ...(payload.specsNet !== undefined ? { specsNet: payload.specsNet } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.customerId !== undefined ? { customerId: payload.customerId } : {}),
    updatedAt: sql`now()`,
  };

  const updated = await db.transaction(async (tx) => {
    const [updatedRow] = await tx
      .update(products)
      .set(patch)
      .where(and(eq(products.id, id), notDeleted(products)))
      .returning();

    if (!updatedRow) {
      ensureProductNotFound();
    }

    if (stockActionType && stockActionQuantity > 0) {
      const quantity =
        stockActionType === "OUT" ? -stockActionQuantity : stockActionQuantity;
      const nextStock = updatedRow.stockQuantity + quantity;
      if (nextStock < 0) {
        ensureInsufficientStock();
      }

      await createStockMovementTx(tx, {
        productId: id,
        quantity,
        movementType: stockActionType,
        referenceType: "adjustment",
        referenceId: id,
        createdBy: user.id,
        notes: stockActionNotes,
      });
    }

    const [fresh] = await tx
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        unit: products.unit,
        price: products.price,
        currency: products.currency,
        stockQuantity: products.stockQuantity,
        minStockLevel: products.minStockLevel,
        otherCodes: products.otherCodes,
        material: products.material,
        postProcess: products.postProcess,
        coating: products.coating,
        specs: products.specs,
        specsNet: products.specsNet,
        notes: products.notes,
        customerId: products.customerId,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(and(eq(products.id, id), notDeleted(products)))
      .limit(1);

    if (!fresh) {
      ensureProductNotFound();
    }

    return fresh;
  });

  return updated;
}

export async function removeProduct({
  data,
}: ServerFnPayload<{ id: number }>) {
  const { id } = productIdSchema.parse(data);
  await requireAuth();

  const removed = await db.transaction(async (tx) => {
    const product = await tx.query.products.findFirst({
      where: and(eq(products.id, id), notDeleted(products)),
      columns: { id: true, stockQuantity: true },
    });

    if (!product) {
      ensureProductNotFound();
    }

    if (product.stockQuantity !== 0) {
      ensureProductHasStock();
    }

    const [softDeleted] = await tx
      .update(products)
      .set({
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(products.id, id), notDeleted(products)))
      .returning({ id: products.id });

    if (!softDeleted) {
      ensureProductNotFound();
    }

    return { success: true, id: softDeleted.id };
  });

  return removed;
}
