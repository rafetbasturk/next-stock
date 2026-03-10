import { NextResponse } from "next/server";

import { destroySession } from "@/lib/auth";

function toSafeRedirectPath(value: string | null): string {
  if (!value) {
    return "/login";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/login";
  }

  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = toSafeRedirectPath(searchParams.get("redirect"));

  await destroySession();

  return NextResponse.redirect(new URL(redirectTo, request.url));
}

