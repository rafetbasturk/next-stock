"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSafeErrorMessage } from "@/lib/errors/mapping";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const supportId =
    "requestId" in error && typeof error.requestId === "string"
      ? error.requestId
      : error.digest ?? "N/A";
  const userMessage =
    "code" in error && typeof error.code === "string"
      ? getSafeErrorMessage(error.code)
      : "We couldn't complete your request. Please try again.";

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle as="h1">Sign-in temporarily unavailable</CardTitle>
          <CardDescription as="p">{userMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            If this keeps happening, contact support and share this reference
            ID:
          </p>
          <code className="bg-muted block rounded-md px-2 py-1 text-xs break-all">
            {supportId}
          </code>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/login" />}>
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
