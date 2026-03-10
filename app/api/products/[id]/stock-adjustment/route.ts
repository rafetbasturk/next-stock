import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { adjustProductStock } from "@/lib/server/products";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";
import { parseStockAdjustmentBody } from "@/lib/validators/mutations";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const productId = await parsePositiveIntRouteParam(context, "product");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonInvalidPayload(requestId);
    }

    const parsed = parseStockAdjustmentBody(body);
    const result = await adjustProductStock({
      data: {
        productId,
        quantity: parsed.quantity,
        notes: parsed.notes,
        actionType: parsed.actionType,
        targetProductId: parsed.targetProductId,
      },
    });

    return jsonOk(result);
  } catch (error) {
    logError("POST /api/products/[id]/stock-adjustment failed", error, {
      requestId,
    });
    return jsonFail(error, requestId);
  }
}
