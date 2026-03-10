import { z } from "zod";

import { AppError, type AppErrorCode, isAppError } from "./app-error";
import { getErrorMessage } from "./mapping";

export type ApiErrorPayload = {
  code: AppErrorCode;
  message: string;
  requestId: string;
  details?: unknown;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorPayload;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

function toKnownAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError("INTERNAL_SERVER_ERROR", getErrorMessage("INTERNAL_SERVER_ERROR"), {
    cause: error,
  });
}

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(error: unknown, requestId: string): ApiFailure {
  const appError = toKnownAppError(error);

  return {
    ok: false,
    error: {
      code: appError.code,
      message: getErrorMessage(appError.code),
      requestId,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  };
}

export function validationFail(error: z.ZodError, requestId: string): ApiFailure {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: getErrorMessage("VALIDATION_ERROR"),
      requestId,
      details: z.treeifyError(error),
    },
  };
}
