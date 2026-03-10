import { getCurrentUser } from "@/lib/auth";
import {
  jsonAuthRequired,
  jsonFail,
  jsonOk,
  jsonValidationFail,
} from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getPaginatedOrderTracking } from "@/lib/server/orders";
import { getServerTimeZone } from "@/lib/server/timezone";
import { orderTrackingSearchSchema } from "@/lib/types/search";
import { requestSearchParamsToObject } from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const parsedSearch = orderTrackingSearchSchema.safeParse(
      requestSearchParamsToObject(request),
    );

    if (!parsedSearch.success) {
      return jsonValidationFail(parsedSearch.error, requestId);
    }

    const timeZone = await getServerTimeZone({
      userTimeZone: user.timeZone,
      requestHeaders: request.headers,
    });

    const paginated = await getPaginatedOrderTracking({
      data: parsedSearch.data,
      timeZone,
    });

    return jsonOk(paginated);
  } catch (error) {
    logError("GET /api/orders/tracking/paginated failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
