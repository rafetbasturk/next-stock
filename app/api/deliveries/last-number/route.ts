import { getCurrentUser } from "@/lib/auth";
import { jsonAuthRequired, jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import {
  getLastDeliveryNumber,
  getLastReturnDeliveryNumber,
} from "@/lib/server/deliveries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const isReturn = kind === "RETURN";

    const lastDeliveryNumber = isReturn
      ? await getLastReturnDeliveryNumber()
      : await getLastDeliveryNumber();

    return jsonOk({ deliveryNumber: lastDeliveryNumber });
  } catch (error) {
    logError("GET /api/deliveries/last-number failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
