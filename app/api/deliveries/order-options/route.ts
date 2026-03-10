import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getDeliveryOrderOptions } from "@/lib/server/deliveries";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("AUTH_REQUIRED");
    }

    const options = await getDeliveryOrderOptions();
    return jsonOk(options);
  } catch (error) {
    logError("GET /api/deliveries/order-options failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
