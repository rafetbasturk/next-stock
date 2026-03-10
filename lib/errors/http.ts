import { NextResponse } from "next/server";
import type { z } from "zod";

import { AppError } from "./app-error";
import { fail, ok, validationFail } from "./api-response";
import { errorToHttpStatus } from "./mapping";

export function jsonOk<T>(data: T, status: number = 200) {
  return NextResponse.json(ok(data), { status });
}

export function jsonFail(error: unknown, requestId: string) {
  return NextResponse.json(fail(error, requestId), {
    status: errorToHttpStatus(error),
  });
}

export function jsonValidationFail(error: z.ZodError, requestId: string) {
  return NextResponse.json(validationFail(error, requestId), {
    status: 400,
  });
}

export function jsonAuthRequired(requestId: string) {
  return jsonFail(new AppError("AUTH_REQUIRED"), requestId);
}

export function jsonInvalidPayload(requestId: string) {
  return jsonFail(
    new AppError("VALIDATION_ERROR", "Invalid request payload."),
    requestId,
  );
}
