import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  buildStockIntegrityReport,
  type StockIntegrityMismatch,
  type StockIntegritySnapshotRow,
} from "@/lib/stock-integrity";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbExecutor = typeof db | DbTransaction;

export type ReconciledStockIntegrityProduct = {
  id: number;
  code: string;
  name: string;
  from: number;
  to: number;
  diff: number;
};

export type ReconcileStockIntegrityResult = {
  fixedCount: number;
  checkedCount: number;
  changedProducts: Array<ReconciledStockIntegrityProduct>;
};

async function listStockIntegritySnapshot(
  executor: DbExecutor,
): Promise<Array<StockIntegritySnapshotRow>> {
  return executor
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      shelf: products.stockQuantity,
      ledger: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)::int`,
    })
    .from(products)
    .leftJoin(
      stockMovements,
      and(
        eq(stockMovements.productId, products.id),
        isNull(stockMovements.deletedAt),
      ),
    )
    .where(isNull(products.deletedAt))
    .groupBy(products.id, products.code, products.name, products.stockQuantity)
    .orderBy(asc(products.code), asc(products.id));
}

async function listStockIntegrityIssues(
  executor: DbExecutor,
): Promise<Array<StockIntegrityMismatch>> {
  const rows = await listStockIntegritySnapshot(executor);
  return buildStockIntegrityReport(rows);
}

export async function getStockIntegrityReport(): Promise<
  Array<StockIntegrityMismatch>
> {
  await requireAdmin();
  return listStockIntegrityIssues(db);
}

export async function reconcileStockIntegrity(): Promise<ReconcileStockIntegrityResult> {
  await requireAdmin();

  return db.transaction(async (tx) => {
    const issues = await listStockIntegrityIssues(tx);
    const changedProducts: Array<ReconciledStockIntegrityProduct> = [];

    for (const issue of issues) {
      const [updated] = await tx
        .update(products)
        .set({
          stockQuantity: issue.ledger,
          updatedAt: sql`now()`,
        })
        .where(and(eq(products.id, issue.id), isNull(products.deletedAt)))
        .returning({ id: products.id });

      if (!updated) {
        continue;
      }

      changedProducts.push({
        id: issue.id,
        code: issue.code,
        name: issue.name,
        from: issue.shelf,
        to: issue.ledger,
        diff: issue.diff,
      });
    }

    return {
      fixedCount: changedProducts.length,
      checkedCount: issues.length,
      changedProducts,
    };
  });
}
