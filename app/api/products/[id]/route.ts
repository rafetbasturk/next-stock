import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getProductById, removeProduct, updateProduct } from "@/lib/server/products";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "product");
    const product = await getProductById({ data: { id } });
    return jsonOk(product);
  } catch (error) {
    logError("GET /api/products/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function PATCH(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "product");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const updated = await updateProduct({ data: { id, data: body } });
    return jsonOk(updated);
  } catch (error) {
    logError("PATCH /api/products/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

export async function DELETE(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const id = await parsePositiveIntRouteParam(context, "product");
    const result = await removeProduct({ data: { id } });
    return jsonOk(result);
  } catch (error) {
    logError("DELETE /api/products/[id] failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
