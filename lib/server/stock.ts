import {
  and,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { products, stockMovements, users } from "@/db/schema";
import { normalizeParams, notDeleted } from "@/lib/server/normalize";
import {
  isStockMovementType,
  type StockMovementType,
} from "@/lib/types/domain";
import { stockSearchSchema } from "@/lib/types/search";

type ServerFnPayload<TData> = { data: TData };

export type StockMovementTableRow = {
  id: number;
  productId: number;
  productCode: string | null;
  productName: string | null;
  movementType: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  createdById: number | null;
  createdByUsername: string | null;
  createdAt: string;
};

type PaginatedStockMovementsResult = {
  data: Array<StockMovementTableRow>;
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export async function getPaginatedStockMovements({
  data,
}: ServerFnPayload<unknown>): Promise<PaginatedStockMovementsResult> {
  const parsed = stockSearchSchema.parse(data);
  const { pageIndex, pageSize, q, movementType, productId } = parsed;

  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.min(Math.max(10, pageSize), 100);
  const normalizedQ = normalizeParams(q);

  const conditions: Array<SQL> = [notDeleted(stockMovements)];

  if (isStockMovementType(movementType)) {
    conditions.push(eq(stockMovements.movementType, movementType));
  }

  if (typeof productId === "number" && productId > 0) {
    conditions.push(eq(stockMovements.productId, productId));
  }

  if (normalizedQ) {
    const search = `%${normalizedQ}%`;
    conditions.push(
      or(
        ilike(products.code, search),
        ilike(products.name, search),
        ilike(users.username, search),
        ilike(stockMovements.notes, search),
        sql`${stockMovements.referenceType}::text ILIKE ${search}`,
        sql`${stockMovements.referenceId}::text ILIKE ${search}`,
      )!,
    );
  }

  const whereExpr: SQL =
    conditions.length === 1 ? conditions[0] : and(...conditions)!;

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockMovements)
      .leftJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.createdBy))
      .where(whereExpr),
    db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productCode: products.code,
        productName: products.name,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        notes: stockMovements.notes,
        createdById: users.id,
        createdByUsername: users.username,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .leftJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.createdBy))
      .where(whereExpr)
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
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

export const getStockMovements = getPaginatedStockMovements;
