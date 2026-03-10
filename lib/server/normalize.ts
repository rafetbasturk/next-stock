import { isNull, type SQL, type SQLWrapper } from "drizzle-orm";
import { TR } from "@/lib/constants";
import { localDateToUtcDayBounds } from "@/lib/timezone";

export function notDeleted(table: { deletedAt: SQLWrapper }): SQL {
  return isNull(table.deletedAt);
}

export function normalizeParams(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeDateParam(value?: string | null): string | undefined {
  const normalized = normalizeParams(value);
  if (!normalized) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined;

  try {
    localDateToUtcDayBounds(normalized, "UTC");
    return normalized;
  } catch {
    return undefined;
  }
}

export function parsePositiveIds(
  value?: string,
  separatorPattern: RegExp = /[|,]/,
): Array<number> {
  if (!value) return [];

  return value
    .split(separatorPattern)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
}

export function toNullableText(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toOptionalPositiveInt(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function normalizeText(input?: string | null): string | null {
  const s = (input ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-");

  return s.length ? s : null;
}

function normalizeLocaleUpperText(input?: string | null): string | null {
  const s = normalizeText(input);
  return s ? s.toLocaleUpperCase(TR) : null;
}

export function normalizeCode(input?: string | null): string | null {
  const s = normalizeText(input);
  if (!s) return null;
  return s.replace(/\s+/g, "").toLocaleUpperCase(TR);
}

export function normalizeMaterial(input?: string | null): string | null {
  return normalizeLocaleUpperText(input);
}

export function normalizeProcess(input?: string | null): string | null {
  return normalizeLocaleUpperText(input);
}
