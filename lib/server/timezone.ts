import { cookies, headers } from "next/headers";

import {
  resolveRequestTimeZone,
  TIME_ZONE_COOKIE_NAME,
} from "@/lib/timezone";

export async function getServerTimeZone(options?: {
  userTimeZone?: string | null;
  requestHeaders?: Headers;
}): Promise<string> {
  const cookieStore = await cookies();
  const headerStore = options?.requestHeaders ?? (await headers());
  const rawCookieTimeZone = cookieStore.get(TIME_ZONE_COOKIE_NAME)?.value;
  const cookieTimeZone = rawCookieTimeZone
    ? (() => {
        try {
          return decodeURIComponent(rawCookieTimeZone);
        } catch {
          return rawCookieTimeZone;
        }
      })()
    : undefined;

  return resolveRequestTimeZone({
    userTimeZone: options?.userTimeZone,
    cookieTimeZone,
    headerTimeZone: headerStore.get("x-timezone"),
  });
}
