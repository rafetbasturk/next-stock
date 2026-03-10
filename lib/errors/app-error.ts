export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "ADMIN_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "RATE_LIMITED"
  | "AUTH_SYSTEM_ERROR"
  | "VALIDATION_ERROR"
  | "CUSTOMER_NOT_FOUND"
  | "CUSTOMER_HAS_ACTIVE_ORDERS"
  | "ORDER_NOT_FOUND"
  | "ORDER_HAS_DELIVERIES"
  | "DELIVERY_NOT_FOUND"
  | "RETURN_QUANTITY_EXCEEDS_DELIVERED"
  | "DELIVERY_KIND_CHANGE_NOT_ALLOWED"
  | "PRODUCT_NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "PRODUCT_HAS_STOCK"
  | "MOVEMENT_NOT_FOUND"
  | "MOVEMENT_NOT_EDITABLE"
  | "MOVEMENT_NOT_REMOVABLE"
  | "CURRENCY_RATE_FETCH_FAILED"
  | "CURRENCY_RATE_INVALID_RESPONSE"
  | "CURRENCY_RATE_NOT_FOUND"
  | "METRICS_FETCH_FAILED"
  | "INTERNAL_SERVER_ERROR";

type AppErrorOptions = {
  details?: unknown;
  cause?: unknown;
};

export class AppError extends Error {
  code: AppErrorCode;
  details?: unknown;
  override cause?: unknown;

  constructor(code: AppErrorCode, message?: string, options?: AppErrorOptions) {
    super(message ?? code);
    this.name = "AppError";
    this.code = code;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
