import { jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getOrderHistory } from "@/lib/server/orders";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
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

    const id = await parsePositiveIntRouteParam(context, "order");
    const history = await getOrderHistory({ data: { id } });
    return jsonOk(history);
  } catch (error) {
    logError("GET /api/orders/[id]/history failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
