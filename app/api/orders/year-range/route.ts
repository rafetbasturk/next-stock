import { getCurrentUser } from "@/lib/auth";
import { jsonAuthRequired, jsonFail, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { yearRangeQuery } from "@/lib/queries/orders";
import { getServerTimeZone } from "@/lib/server/timezone";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const timeZone = await getServerTimeZone({
      userTimeZone: user.timeZone,
      requestHeaders: request.headers,
    });
    const yearRange = await yearRangeQuery(timeZone);
    return jsonOk(yearRange);
  } catch (error) {
    logError("GET /api/orders/year-range failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
