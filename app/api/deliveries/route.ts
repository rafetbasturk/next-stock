import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { createDelivery } from "@/lib/server/deliveries";

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

    const createdDelivery = await createDelivery({ data: body });
    return jsonOk(createdDelivery, 201);
  } catch (error) {
    logError("POST /api/deliveries failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
