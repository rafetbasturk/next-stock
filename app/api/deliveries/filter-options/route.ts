import { getCurrentUser } from "@/lib/auth";
import { jsonAuthRequired, jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getDeliveryFilterOptions } from "@/lib/server/deliveries";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const filterOptions = await getDeliveryFilterOptions();
    return jsonOk(filterOptions);
  } catch (error) {
    logError("GET /api/deliveries/filter-options failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
