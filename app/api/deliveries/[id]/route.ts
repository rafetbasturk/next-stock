import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import {
  getDeliveryById,
  removeDelivery,
  updateDelivery,
} from "@/lib/server/deliveries";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "delivery");
    const delivery = await getDeliveryById({ data: { id } });
    return jsonOk(delivery);
  } catch (error) {
    logError("GET /api/deliveries/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function PATCH(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "delivery");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const updated = await updateDelivery({ data: { id, data: body } });
    return jsonOk(updated);
  } catch (error) {
    logError("PATCH /api/deliveries/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function DELETE(_: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "delivery");
    const result = await removeDelivery({ data: { id } });
    return jsonOk(result);
  } catch (error) {
    logError("DELETE /api/deliveries/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
