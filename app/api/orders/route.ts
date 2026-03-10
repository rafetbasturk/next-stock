import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { createOrder } from "@/lib/server/orders";

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

    const createdOrder = await createOrder({ data: body });
    return jsonOk(createdOrder, 201);
  } catch (error) {
    logError("POST /api/orders failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
