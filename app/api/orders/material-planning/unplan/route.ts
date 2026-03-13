import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { undoMaterialPlanningCompleted } from "@/lib/server/orders";
import { parseMaterialPlanningUnplanBody } from "@/lib/validators/mutations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const parsed = parseMaterialPlanningUnplanBody(body);
    const result = await undoMaterialPlanningCompleted({ data: parsed });
    return jsonOk(result);
  } catch (error) {
    logError("POST /api/orders/material-planning/unplan failed", error, {
      requestId,
    });
    return jsonFail(error, requestId);
  }
}
