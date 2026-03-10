import { isAppError } from "./app-error";

export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  const baseMeta = {
    context,
    ...(meta ?? {}),
  };

  if (isAppError(error)) {
    console.error("[app-error]", {
      ...baseMeta,
      code: error.code,
      message: error.message,
      details: error.details,
      cause: error.cause,
    });
    return;
  }

  if (error instanceof Error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[error]", { ...baseMeta, error });
      return;
    }

    console.error("[error]", {
      ...baseMeta,
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return;
  }

  console.error("[error]", {
    ...baseMeta,
    error,
  });
}
