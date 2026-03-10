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

export default function AppError({
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
      : "The page failed to load. You can retry or go back to the home page.";

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle as="h1">Something went wrong</CardTitle>
          <CardDescription as="p">{userMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Support reference ID:
          </p>
          <code className="bg-muted block rounded-md px-2 py-1 text-xs break-all">
            {supportId}
          </code>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/" />}>
            Go home
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
