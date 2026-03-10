import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { stockMovementTypeArray } from "@/lib/constants";
import { AppError } from "@/lib/errors/app-error";
import { syncReadyStatusesForProductsTx } from "@/lib/server/orders";
import { notDeleted, toNullableText } from "@/lib/server/normalize";
import type { StockMovementType } from "@/lib/types/domain";

type ServerFnPayload<TData> = { data: TData };

function ensureAuthError(): never {
  throw new AppError("AUTH_REQUIRED");
}

function ensureMovementNotFound(): never {
  throw new AppError("MOVEMENT_NOT_FOUND");
}

function ensureMovementNotEditable(): never {
  throw new AppError("MOVEMENT_NOT_EDITABLE");
}

function ensureMovementNotRemovable(): never {
  throw new AppError("MOVEMENT_NOT_REMOVABLE");
}

function ensureProductNotFound(): never {
  throw new AppError("PRODUCT_NOT_FOUND");
}

function ensureInsufficientStock(): never {
  throw new AppError("INSUFFICIENT_STOCK");
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) ensureAuthError();
  return user;
}

const editableMovementTypes = new Set<StockMovementType>(
  stockMovementTypeArray.filter(
    (type): type is Extract<StockMovementType, "IN" | "OUT" | "ADJUSTMENT"> =>
      type === "IN" || type === "OUT" || type === "ADJUSTMENT",
  ),
);

function validateQuantityForType(
  movementType: StockMovementType,
  quantity: number,
) {
  if (!editableMovementTypes.has(movementType)) {
    ensureMovementNotEditable();
  }

  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid request data.");
  }

  if (movementType === "IN" && quantity <= 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid request data.");
  }

  if (movementType === "OUT" && quantity >= 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid request data.");
  }
}

export async function updateStockMovement({
  data,
}: ServerFnPayload<{
  id: number;
  quantity: number;
  notes?: string | null;
  movementType?: Extract<StockMovementType, "IN" | "OUT" | "ADJUSTMENT">;
}>) {
  await requireAuth();

  const id = Number(data?.id);
  const rawQuantity = Number(data?.quantity);
  const quantity = Math.trunc(rawQuantity);
  const notes = toNullableText(data?.notes);
  const movementType = data?.movementType;

  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(rawQuantity)) {
    throw new AppError("VALIDATION_ERROR", "Invalid request data.");
  }

  return db.transaction(async (tx) => {
    const [existingMovement] = await tx
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        updatedAt: stockMovements.updatedAt,
      })
      .from(stockMovements)
      .where(and(eq(stockMovements.id, id), notDeleted(stockMovements)))
      .limit(1);

    if (!existingMovement) {
      ensureMovementNotFound();
    }

    const nextMovementType = movementType ?? existingMovement.movementType;
    validateQuantityForType(nextMovementType, quantity);

    const [updatedMovement] = await tx
      .update(stockMovements)
      .set({
        movementType: nextMovementType,
        quantity,
        notes,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(stockMovements.id, id),
          notDeleted(stockMovements),
          eq(stockMovements.updatedAt, existingMovement.updatedAt),
        ),
      )
      .returning({
        id: stockMovements.id,
      });

    if (!updatedMovement) {
      throw new AppError("VALIDATION_ERROR", "Invalid request data.");
    }

    const delta = quantity - existingMovement.quantity;

    if (delta !== 0) {
      const [updatedProduct] = await tx
        .update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${delta}`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(products.id, existingMovement.productId),
            notDeleted(products),
            sql`${products.stockQuantity} + ${delta} >= 0`,
          ),
        )
        .returning({ id: products.id });

      if (!updatedProduct) {
        const [productExists] = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.id, existingMovement.productId), notDeleted(products)))
          .limit(1);

        if (!productExists) {
          ensureProductNotFound();
        }

        ensureInsufficientStock();
      }

      if (delta > 0) {
        await syncReadyStatusesForProductsTx(tx, [existingMovement.productId]);
      }
    }

    return { success: true, id };
  });
}

export async function removeStockMovement({
  data,
}: ServerFnPayload<{ id: number }>) {
  await requireAuth();

  const id = Number(data?.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid request data.");
  }

  return db.transaction(async (tx) => {
    const [existingMovement] = await tx
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
      })
      .from(stockMovements)
      .where(and(eq(stockMovements.id, id), notDeleted(stockMovements)))
      .limit(1);

    if (!existingMovement) {
      ensureMovementNotFound();
    }

    if (
      existingMovement.movementType === "IN" ||
      existingMovement.movementType === "OUT" ||
      existingMovement.movementType === "ADJUSTMENT"
    ) {
      const rollbackDelta = -existingMovement.quantity;
      const [updatedProduct] = await tx
        .update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${rollbackDelta}`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(products.id, existingMovement.productId),
            notDeleted(products),
            sql`${products.stockQuantity} + ${rollbackDelta} >= 0`,
          ),
        )
        .returning({ id: products.id });

      if (!updatedProduct) {
        const [productExists] = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.id, existingMovement.productId), notDeleted(products)))
          .limit(1);

        if (!productExists) {
          ensureProductNotFound();
        }

        ensureInsufficientStock();
      }

      if (rollbackDelta > 0) {
        await syncReadyStatusesForProductsTx(tx, [existingMovement.productId]);
      }

      const [removed] = await tx
        .update(stockMovements)
        .set({
          deletedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(and(eq(stockMovements.id, id), notDeleted(stockMovements)))
        .returning({ id: stockMovements.id });

      if (!removed) {
        ensureMovementNotFound();
      }

      return { success: true, id };
    }

    if (existingMovement.movementType === "TRANSFER") {
      const transferReferenceId = existingMovement.referenceId ?? existingMovement.id;
      if (transferReferenceId <= 0) {
        ensureMovementNotRemovable();
      }

      const transferRows = await tx
        .select({
          id: stockMovements.id,
          productId: stockMovements.productId,
          quantity: stockMovements.quantity,
        })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.referenceType, "transfer"),
            eq(stockMovements.referenceId, transferReferenceId),
            notDeleted(stockMovements),
          ),
        );

      const sourceRow = transferRows.find((row) => row.quantity < 0);
      const targetRow = transferRows.find((row) => row.quantity > 0);

      if (
        !sourceRow ||
        !targetRow ||
        transferRows.length < 2 ||
        Math.abs(sourceRow.quantity) !== targetRow.quantity
      ) {
        ensureMovementNotRemovable();
      }

      const transferQuantity = targetRow.quantity;

      const [restoredSource] = await tx
        .update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${transferQuantity}`,
          updatedAt: sql`now()`,
        })
        .where(and(eq(products.id, sourceRow.productId), notDeleted(products)))
        .returning({ id: products.id });

      if (!restoredSource) {
        ensureProductNotFound();
      }

      const [rolledBackTarget] = await tx
        .update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} - ${transferQuantity}`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(products.id, targetRow.productId),
            notDeleted(products),
            sql`${products.stockQuantity} - ${transferQuantity} >= 0`,
          ),
        )
        .returning({ id: products.id });

      if (!rolledBackTarget) {
        const [productExists] = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.id, targetRow.productId), notDeleted(products)))
          .limit(1);

        if (!productExists) {
          ensureProductNotFound();
        }

        ensureInsufficientStock();
      }

      await syncReadyStatusesForProductsTx(tx, [sourceRow.productId]);

      await tx
        .update(stockMovements)
        .set({
          deletedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(stockMovements.referenceType, "transfer"),
            eq(stockMovements.referenceId, transferReferenceId),
            notDeleted(stockMovements),
          ),
        );

      return { success: true, id };
    }

    ensureMovementNotRemovable();
  });
}
