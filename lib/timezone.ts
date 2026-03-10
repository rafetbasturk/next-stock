const DEFAULT_TIME_ZONE = "UTC";
export const TIME_ZONE_COOKIE_NAME = "tz";

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

type ResolveRequestTimeZoneInput = {
  userTimeZone?: string | null;
  cookieTimeZone?: string | null;
  headerTimeZone?: string | null;
};

type ParsedLocalDate = {
  year: number;
  month: number;
  day: number;
};

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

const zonedDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = zonedDateTimeFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  zonedDateTimeFormatterCache.set(timeZone, formatter);
  return formatter;
}

function parseNumberPart(parts: Array<Intl.DateTimeFormatPart>, type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) {
    throw new Error(`Missing Intl.DateTimeFormat part: ${type}`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Intl.DateTimeFormat part: ${type}`);
  }

  return parsed;
}

function toZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  return {
    year: parseNumberPart(parts, "year"),
    month: parseNumberPart(parts, "month"),
    day: parseNumberPart(parts, "day"),
    hour: parseNumberPart(parts, "hour"),
    minute: parseNumberPart(parts, "minute"),
    second: parseNumberPart(parts, "second"),
  };
}

function getOffsetMs(date: Date, timeZone: string): number {
  const zoned = toZonedDateParts(date, timeZone);
  const interpretedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  return interpretedAsUtc - date.getTime();
}

function zonedDateTimeToUtcIso(
  localDateTime: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  },
  timeZone: string,
): string {
  const hour = localDateTime.hour ?? 0;
  const minute = localDateTime.minute ?? 0;
  const second = localDateTime.second ?? 0;
  const millisecond = localDateTime.millisecond ?? 0;

  let candidateUtc = Date.UTC(
    localDateTime.year,
    localDateTime.month - 1,
    localDateTime.day,
    hour,
    minute,
    second,
    millisecond,
  );

  for (let i = 0; i < 5; i += 1) {
    const offset = getOffsetMs(new Date(candidateUtc), timeZone);
    const next =
      Date.UTC(
        localDateTime.year,
        localDateTime.month - 1,
        localDateTime.day,
        hour,
        minute,
        second,
        millisecond,
      ) - offset;

    if (next === candidateUtc) {
      break;
    }

    candidateUtc = next;
  }

  return new Date(candidateUtc).toISOString();
}

function addDays(localDate: ParsedLocalDate, days: number): ParsedLocalDate {
  const shifted = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day + days),
  );

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function normalizeCandidateTimeZone(value?: string | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return isValidIanaTimeZone(normalized) ? normalized : undefined;
}

function parseStrictLocalDate(localDate: string): ParsedLocalDate {
  const match = LOCAL_DATE_RE.exec(localDate);
  if (!match) {
    throw new Error("Invalid local date format. Expected YYYY-MM-DD.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    throw new Error("Invalid local date value.");
  }

  return { year, month, day };
}

export function isValidIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveRequestTimeZone({
  userTimeZone,
  cookieTimeZone,
  headerTimeZone,
}: ResolveRequestTimeZoneInput): string {
  return (
    normalizeCandidateTimeZone(userTimeZone) ??
    normalizeCandidateTimeZone(cookieTimeZone) ??
    normalizeCandidateTimeZone(headerTimeZone) ??
    DEFAULT_TIME_ZONE
  );
}

export function localDateToUtcDayBounds(
  localDate: string,
  timeZone: string,
): { startIso: string; endExclusiveIso: string } {
  const normalizedTimeZone = resolveRequestTimeZone({
    headerTimeZone: timeZone,
  });
  const parsed = parseStrictLocalDate(localDate);
  const next = addDays(parsed, 1);

  return {
    startIso: zonedDateTimeToUtcIso(parsed, normalizedTimeZone),
    endExclusiveIso: zonedDateTimeToUtcIso(next, normalizedTimeZone),
  };
}

export function utcInstantToLocalYearMonth(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid UTC instant value.");
  }

  const normalizedTimeZone = resolveRequestTimeZone({
    headerTimeZone: timeZone,
  });
  const zoned = toZonedDateParts(date, normalizedTimeZone);

  return `${zoned.year}-${String(zoned.month).padStart(2, "0")}`;
}

export function utcInstantToLocalDateParts(
  iso: string,
  timeZone: string,
): LocalDateParts {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid UTC instant value.");
  }

  const normalizedTimeZone = resolveRequestTimeZone({
    headerTimeZone: timeZone,
  });
  const zoned = toZonedDateParts(date, normalizedTimeZone);

  return {
    year: zoned.year,
    month: zoned.month,
    day: zoned.day,
  };
}
