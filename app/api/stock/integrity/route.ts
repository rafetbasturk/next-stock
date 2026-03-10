import { jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getStockIntegrityReport } from "@/lib/server/stock-integrity";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();

  try {
    const report = await getStockIntegrityReport();
    return jsonOk(report);
  } catch (error) {
    logError("GET /api/stock/integrity failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
