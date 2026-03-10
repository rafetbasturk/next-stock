"use client";

import { useEffect } from "react";
import { getSafeErrorMessage } from "@/lib/errors/mapping";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const supportId =
    "requestId" in error && typeof error.requestId === "string"
      ? error.requestId
      : error.digest ?? "N/A";
  const userMessage =
    "code" in error && typeof error.code === "string"
      ? getSafeErrorMessage(error.code)
      : "A critical error occurred. Please reload the app.";

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center p-4">
          <div className="bg-card text-card-foreground ring-foreground/10 w-full max-w-lg rounded-xl p-6 ring-1">
            <h1 className="text-lg font-semibold">Application error</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {userMessage}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Reference: {supportId}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium"
              >
                Go home
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
