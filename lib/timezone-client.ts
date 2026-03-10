import { resolveRequestTimeZone } from "@/lib/timezone";

export function getClientTimeZone(): string {
  const appSettingsTimeZone =
    typeof window !== "undefined" ? window.__APP_SETTINGS__?.timeZone : undefined;
  const appSettingsTimeZoneSource =
    typeof window !== "undefined"
      ? window.__APP_SETTINGS__?.timeZoneSource
      : undefined;
  const browserTimeZone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  if (appSettingsTimeZoneSource === "profile") {
    return resolveRequestTimeZone({
      userTimeZone: appSettingsTimeZone,
      headerTimeZone: browserTimeZone,
    });
  }

  return resolveRequestTimeZone({
    userTimeZone: browserTimeZone,
    cookieTimeZone: appSettingsTimeZone,
  });
}
