import { AppError, type AppErrorCode } from "@/lib/errors/app-error";

export type AuthErrorCode = Extract<
  AppErrorCode,
  "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "RATE_LIMITED" | "AUTH_SYSTEM_ERROR"
>;

export class AuthError extends AppError {
  override code: AuthErrorCode;
  retryAfterSeconds?: number;

  constructor(
    code: AuthErrorCode,
    message: string,
    options?: { retryAfterSeconds?: number },
  ) {
    super(code, message, {
      details:
        options?.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: options.retryAfterSeconds }
          : undefined,
    });
    this.name = "AuthError";
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
