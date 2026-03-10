"use client";

import { useEffect } from "react";

import { resolveRequestTimeZone, TIME_ZONE_COOKIE_NAME } from "@/lib/timezone";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function TimezoneBootstrap() {
  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZone = resolveRequestTimeZone({
      headerTimeZone: browserTimeZone,
    });

    document.cookie = `${TIME_ZONE_COOKIE_NAME}=${timeZone}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;

    if (
      window.__APP_SETTINGS__ &&
      window.__APP_SETTINGS__.timeZoneSource !== "profile"
    ) {
      window.__APP_SETTINGS__.timeZone = timeZone;
      window.__APP_SETTINGS__.timeZoneSource = "request";
    }
  }, []);

  return null;
}
