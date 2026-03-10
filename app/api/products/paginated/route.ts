import { getCurrentUser } from "@/lib/auth";
import {
  jsonAuthRequired,
  jsonFail,
  jsonOk,
  jsonValidationFail,
} from "@/lib/errors/http";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getPaginatedProducts } from "@/lib/server/products";
import { productsSearchSchema } from "@/lib/types/search";
import { requestSearchParamsToObject } from "@/lib/validators/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonAuthRequired(requestId);
    }

    const parsedSearch = productsSearchSchema.safeParse(
      requestSearchParamsToObject(request),
    );

    if (!parsedSearch.success) {
      return jsonValidationFail(parsedSearch.error, requestId);
    }

    const paginated = await getPaginatedProducts({ data: parsedSearch.data });
    return jsonOk(paginated);
  } catch (error) {
    logError("GET /api/products/paginated failed", error, { requestId });
    return jsonFail(error, requestId);
  }
}

