import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { markMaterialPlanningCompleted } from "@/lib/server/orders";
import { parseMaterialPlanningPlanBody } from "@/lib/validators/mutations";

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

    const parsed = parseMaterialPlanningPlanBody(body);
    const result = await markMaterialPlanningCompleted({ data: parsed });
    return jsonOk(result);
  } catch (error) {
    logError("POST /api/orders/material-planning/plan failed", error, {
      requestId,
    });
    return jsonFail(error, requestId);
  }
}
