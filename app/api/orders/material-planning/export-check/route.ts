import { getCurrentUser } from "@/lib/auth";
import {
  jsonAuthRequired,
  jsonFail,
  jsonOk,
  jsonValidationFail,
} from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getMaterialPlanningExportWarnings } from "@/lib/server/orders";
import { materialPlanningSearchSchema } from "@/lib/types/search";
import { requestSearchParamsToObject } from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const parsedSearch = materialPlanningSearchSchema.safeParse(
      requestSearchParamsToObject(request),
    );

    if (!parsedSearch.success) {
      return jsonValidationFail(parsedSearch.error, requestId);
    }

    const warnings = await getMaterialPlanningExportWarnings(parsedSearch.data);
    return jsonOk(warnings);
  } catch (error) {
    logError("GET /api/orders/material-planning/export-check failed", error, {
      requestId,
    });
    return jsonFail(error, requestId);
  }
}
