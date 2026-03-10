import type { ApiFailure, ApiResponse } from "./api-response";
import { isAppError } from "./app-error";
import {
  errorToHttpStatus,
  getErrorMessage,
  getSafeErrorMessage,
  isAppErrorCode,
} from "./mapping";

type ClientErrorOptions = {
  code?: string;
  status?: number;
  requestId?: string;
  details?: unknown;
  cause?: unknown;
};

export class ClientError extends Error {
  code: string;
  status: number;
  requestId?: string;
  details?: unknown;
  override cause?: unknown;

  constructor(message: string, options?: ClientErrorOptions) {
    super(message);
    this.name = "ClientError";
    this.code = options?.code ?? "INTERNAL_SERVER_ERROR";
    this.status = options?.status ?? 500;
    this.requestId = options?.requestId;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}

export function isClientError(error: unknown): error is ClientError {
  return error instanceof ClientError;
}

function isApiFailure(payload: unknown): payload is ApiFailure {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<ApiFailure>;
  if (candidate.ok !== false || !candidate.error || typeof candidate.error !== "object") {
    return false;
  }

  const err = candidate.error as { code?: unknown; message?: unknown; requestId?: unknown };

  return (
    typeof err.code === "string" &&
    typeof err.message === "string" &&
    typeof err.requestId === "string"
  );
}

export function toClientError(error: unknown): ClientError {
  if (isClientError(error)) {
    return error;
  }

  if (isAppError(error)) {
    return new ClientError(getErrorMessage(error.code), {
      code: error.code,
      status: errorToHttpStatus(error),
      details: error.details,
      cause: error,
    });
  }

  if (isApiFailure(error)) {
    return new ClientError(error.error.message, {
      code: error.error.code,
      status: errorToHttpStatus(error.error.code),
      requestId: error.error.requestId,
      details: error.error.details,
    });
  }

  if (error instanceof Error && isAppErrorCode(error.message)) {
    return new ClientError(getErrorMessage(error.message), {
      code: error.message,
      status: errorToHttpStatus(error.message),
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ClientError(getSafeErrorMessage(error.message), {
      code: isAppErrorCode(error.message) ? error.message : "INTERNAL_SERVER_ERROR",
      status: isAppErrorCode(error.message)
        ? errorToHttpStatus(error.message)
        : 500,
      cause: error,
    });
  }

  return new ClientError(getErrorMessage("INTERNAL_SERVER_ERROR"), {
    code: "INTERNAL_SERVER_ERROR",
    status: 500,
  });
}

export function isApiResponseFailure<T>(response: ApiResponse<T>): response is ApiFailure {
  return response.ok === false;
}
