import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { removeStockMovement, updateStockMovement } from "@/lib/server/movements";
import { parseMovementUpdateBody } from "@/lib/validators/mutations";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "movement");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const parsed = parseMovementUpdateBody(body);
    const result = await updateStockMovement({
      data: {
        id,
        quantity: parsed.quantity,
        notes: parsed.notes,
        movementType: parsed.movementType,
      },
    });

    return jsonOk(result);
  } catch (error) {
    logError("PATCH /api/movements/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function DELETE(_: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "movement");
    const result = await removeStockMovement({ data: { id } });
    return jsonOk(result);
  } catch (error) {
    logError("DELETE /api/movements/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
