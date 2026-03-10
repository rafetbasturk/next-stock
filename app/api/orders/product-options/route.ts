import { getCurrentUser } from "@/lib/auth";
import { jsonAuthRequired, jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getOrderProductOptions } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const options = await getOrderProductOptions();
    return jsonOk(options);
  } catch (error) {
    logError("GET /api/orders/product-options failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
