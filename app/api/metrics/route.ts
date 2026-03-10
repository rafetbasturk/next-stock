import { getCurrentUser } from "@/lib/auth";
import {
  jsonAuthRequired,
  jsonFail,
  jsonInvalidPayload,
  jsonOk,
  jsonValidationFail,
} from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getKeyMetrics } from "@/lib/server/metrics";
import { getServerTimeZone } from "@/lib/server/timezone";
import type { KeyMetricsInput } from "@/lib/types/metrics";
import {
  metricsRequestBodySchema,
  metricsSearchParamsSchema,
  requestSearchParamsToObject,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const parsedSearch = metricsSearchParamsSchema.safeParse(
      requestSearchParamsToObject(request),
    );

    if (!parsedSearch.success) {
      return jsonValidationFail(parsedSearch.error, requestId);
    }

    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const parsedBody = metricsRequestBodySchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return jsonValidationFail(parsedBody.error, requestId);
    }

    const body = parsedBody.data;
    const search = parsedSearch.data;

    const mergedFilters = {
      customerId: body.filters?.customerId ?? search.customerId,
      year: body.filters?.year ?? search.year,
    };

    const payload: KeyMetricsInput = {
      rates: body.rates,
      filters:
        mergedFilters.customerId !== undefined || mergedFilters.year !== undefined
          ? mergedFilters
          : undefined,
      preferredCurrency: body.preferredCurrency ?? search.preferredCurrency,
    };

    const timeZone = await getServerTimeZone({
      userTimeZone: user.timeZone,
      requestHeaders: request.headers,
    });

    const metrics = await getKeyMetrics({
      ...payload,
      timeZone,
    });

    return jsonOk(metrics);
  } catch (error) {
    logError("POST /api/metrics failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
