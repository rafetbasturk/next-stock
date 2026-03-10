import { getCurrentUser } from "@/lib/auth";
import { jsonAuthRequired, jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getLastOrderNumber } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const lastOrderNumber = await getLastOrderNumber();
    return jsonOk({ orderNumber: lastOrderNumber });
  } catch (error) {
    logError("GET /api/orders/last-number failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
