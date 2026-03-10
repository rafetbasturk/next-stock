import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { removeCustomer, updateCustomer } from "@/lib/server/customers";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "customer");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const updatedCustomer = await updateCustomer({ data: { id, data: body } });
    return jsonOk(updatedCustomer);
  } catch (error) {
    logError("PATCH /api/customers/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function DELETE(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "customer");
    const result = await removeCustomer({ data: { id } });
    return jsonOk(result);
  } catch (error) {
    logError("DELETE /api/customers/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
