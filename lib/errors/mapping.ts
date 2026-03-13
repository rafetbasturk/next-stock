import { AppError, type AppErrorCode, isAppError } from "./app-error";

const ERROR_HTTP_STATUS: Record<AppErrorCode, number> = {
  AUTH_REQUIRED: 401,
  ADMIN_REQUIRED: 403,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 423,
  RATE_LIMITED: 429,
  AUTH_SYSTEM_ERROR: 500,
  VALIDATION_ERROR: 400,
  CUSTOMER_NOT_FOUND: 404,
  CUSTOMER_HAS_ACTIVE_ORDERS: 409,
  ORDER_NOT_FOUND: 404,
  ORDER_ITEM_NOT_FOUND: 404,
  ORDER_HAS_DELIVERIES: 409,
  DELIVERY_NOT_FOUND: 404,
  RETURN_QUANTITY_EXCEEDS_DELIVERED: 409,
  DELIVERY_KIND_CHANGE_NOT_ALLOWED: 409,
  PRODUCT_NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  PRODUCT_HAS_STOCK: 409,
  MOVEMENT_NOT_FOUND: 404,
  MOVEMENT_NOT_EDITABLE: 409,
  MOVEMENT_NOT_REMOVABLE: 409,
  CURRENCY_RATE_FETCH_FAILED: 502,
  CURRENCY_RATE_INVALID_RESPONSE: 502,
  CURRENCY_RATE_NOT_FOUND: 422,
  METRICS_FETCH_FAILED: 500,
  INTERNAL_SERVER_ERROR: 500,
};

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: "You need to sign in to continue.",
  ADMIN_REQUIRED: "You do not have permission to perform this action.",
  INVALID_CREDENTIALS: "Invalid username or password.",
  ACCOUNT_LOCKED: "Your account is temporarily locked.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  AUTH_SYSTEM_ERROR: "Authentication service is temporarily unavailable.",
  VALIDATION_ERROR: "Invalid request data.",
  CUSTOMER_NOT_FOUND: "Customer not found.",
  CUSTOMER_HAS_ACTIVE_ORDERS: "Customer has active orders and cannot be deleted.",
  ORDER_NOT_FOUND: "Order not found.",
  ORDER_ITEM_NOT_FOUND: "Order item not found.",
  ORDER_HAS_DELIVERIES: "Order has deliveries and cannot be modified.",
  DELIVERY_NOT_FOUND: "Delivery not found.",
  RETURN_QUANTITY_EXCEEDS_DELIVERED:
    "Return quantity exceeds already delivered quantity.",
  DELIVERY_KIND_CHANGE_NOT_ALLOWED: "Delivery kind cannot be changed.",
  PRODUCT_NOT_FOUND: "Product not found.",
  INSUFFICIENT_STOCK: "Insufficient stock.",
  PRODUCT_HAS_STOCK: "Product has stock and cannot be deleted.",
  MOVEMENT_NOT_FOUND: "Stock movement not found.",
  MOVEMENT_NOT_EDITABLE: "This stock movement type cannot be edited here.",
  MOVEMENT_NOT_REMOVABLE: "This stock movement type cannot be removed here.",
  CURRENCY_RATE_FETCH_FAILED: "Could not fetch currency rates.",
  CURRENCY_RATE_INVALID_RESPONSE: "Currency provider returned invalid data.",
  CURRENCY_RATE_NOT_FOUND: "Currency conversion rate could not be found.",
  METRICS_FETCH_FAILED: "Could not load metrics right now.",
  INTERNAL_SERVER_ERROR: "An unexpected error occurred.",
};

export function isAppErrorCode(value: string): value is AppErrorCode {
  return value in ERROR_HTTP_STATUS;
}

export function getErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code];
}

export function getSafeErrorMessage(code: string): string {
  return isAppErrorCode(code)
    ? ERROR_MESSAGES[code]
    : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError("INTERNAL_SERVER_ERROR", getErrorMessage("INTERNAL_SERVER_ERROR"), {
    cause: error,
  });
}

export function errorToHttpStatus(errorOrCode: unknown): number {
  if (typeof errorOrCode === "string" && isAppErrorCode(errorOrCode)) {
    return ERROR_HTTP_STATUS[errorOrCode];
  }

  if (isAppError(errorOrCode)) {
    return ERROR_HTTP_STATUS[errorOrCode.code];
  }

  return ERROR_HTTP_STATUS.INTERNAL_SERVER_ERROR;
}
