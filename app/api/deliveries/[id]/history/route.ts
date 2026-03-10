import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getDeliveryHistory } from "@/lib/server/deliveries";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("AUTH_REQUIRED");
    }

    const id = await parsePositiveIntRouteParam(context, "delivery");
    const history = await getDeliveryHistory({ data: { id } });
    return jsonOk(history);
  } catch (error) {
    logError("GET /api/deliveries/[id]/history failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
