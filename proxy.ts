import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import {
  isValidIanaTimeZone,
  TIME_ZONE_COOKIE_NAME,
} from "@/lib/timezone";

function detectLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null,
): Locale {
  if (!acceptLanguageHeader) {
    return defaultLocale;
  }

  const candidates = acceptLanguageHeader
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim().split(";")[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.startsWith("tr")) {
      return "tr";
    }

    if (candidate.startsWith("en")) {
      return "en";
    }

    const base = candidate.split("-")[0];
    if (base && isLocale(base)) {
      return base;
    }
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const localeCookie = request.cookies.get("locale")?.value;
  if (!localeCookie || !isLocale(localeCookie)) {
    const detectedLocale = detectLocaleFromAcceptLanguage(
      request.headers.get("accept-language"),
    );

    response.cookies.set("locale", detectedLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const timezoneHeader = request.headers.get("x-timezone");
  const rawTimezoneCookie = request.cookies.get(TIME_ZONE_COOKIE_NAME)?.value;
  const timezoneCookie = rawTimezoneCookie
    ? (() => {
        try {
          return decodeURIComponent(rawTimezoneCookie);
        } catch {
          return rawTimezoneCookie;
        }
      })()
    : undefined;
  const normalizedTimezoneHeader = timezoneHeader?.trim();

  if (
    normalizedTimezoneHeader &&
    isValidIanaTimeZone(normalizedTimezoneHeader) &&
    normalizedTimezoneHeader !== timezoneCookie
  ) {
    response.cookies.set(TIME_ZONE_COOKIE_NAME, normalizedTimezoneHeader, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
