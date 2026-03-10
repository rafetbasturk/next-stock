import { jsonFail, jsonInvalidPayload, jsonOk } from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { createProduct } from "@/lib/server/products";

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

    const createdProduct = await createProduct({ data: body });
    return jsonOk(createdProduct, 201);
  } catch (error) {
    logError("POST /api/products failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}
