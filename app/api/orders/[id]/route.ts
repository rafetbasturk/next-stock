import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getOrderById, removeOrder, updateOrder } from "@/lib/server/orders";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "order");
    const order = await getOrderById({ data: { id } });
    return jsonOk(order);
  } catch (error) {
    logError("GET /api/orders/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function PATCH(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "order");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const updatedOrder = await updateOrder({ data: { id, data: body } });
    return jsonOk(updatedOrder);
  } catch (error) {
    logError("PATCH /api/orders/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function DELETE(_: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "order");
    const result = await removeOrder({ data: { id } });
    return jsonOk(result);
  } catch (error) {
    logError("DELETE /api/orders/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
