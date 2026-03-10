import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { createCustomer } from "@/lib/server/customers";

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

    const createdCustomer = await createCustomer({ data: body });
    return jsonOk(createdCustomer, 201);
  } catch (error) {
    logError("POST /api/customers failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
