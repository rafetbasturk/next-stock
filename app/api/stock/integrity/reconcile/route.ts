import { jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { reconcileStockIntegrity } from "@/lib/server/stock-integrity";

export const dynamic = "force-dynamic";

export async function POST() {
  const requestId = createRequestId();

  try {
    const result = await reconcileStockIntegrity();
    return jsonOk(result);
  } catch (error) {
    logError("POST /api/stock/integrity/reconcile failed", error, {
      requestId,
    });
    return jsonFail(error, requestId);
  }
}
