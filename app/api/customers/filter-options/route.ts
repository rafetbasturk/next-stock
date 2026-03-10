import { and, eq, isNull } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { jsonAuthRequired, jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";

type CustomerFilterOption = {
  id: number;
  name: string;
  code: string;
};

export const dynamic = "force-dynamic";

function normalizeRows(rows: Array<CustomerFilterOption>): Array<CustomerFilterOption> {
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      code: row.code.trim(),
    }))
    .filter((row) => row.name.length > 0)
    .sort((a, b) => a.code.localeCompare(b.code, "tr", { sensitivity: "base" }));
}

export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const searchParams = new URL(request.url).searchParams;
    const distinct = searchParams.get("distinct") === "true";

    if (distinct) {
      const customerRows = await db
        .selectDistinct({
          id: orders.customerId,
          name: customers.name,
          code: customers.code,
        })
        .from(orders)
        .innerJoin(customers, eq(customers.id, orders.customerId))
        .where(and(isNull(orders.deletedAt), isNull(customers.deletedAt)));

      return jsonOk(normalizeRows(customerRows));
    }

    const customerRows = await db
      .select({
        id: customers.id,
        name: customers.name,
        code: customers.code,
      })
      .from(customers)
      .where(isNull(customers.deletedAt));

    return jsonOk(normalizeRows(customerRows));
  } catch (error) {
    logError("GET /api/customers/filter-options failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

