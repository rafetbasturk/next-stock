export function normalizeFieldPath(path: string): string {
  return path.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
}

export function parseLocaleNumber(value: string): number {
  const raw = value.replace(/\s|\u00A0/g, "").trim();
  if (!raw) return 0;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex < 0) {
    const intOnly = raw.replace(/[^\d-]/g, "");
    const parsed = Number(intOnly);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const decimalDigits = raw.length - decimalIndex - 1;
  if (decimalDigits > 2) {
    const intOnly = raw.replace(/[^\d-]/g, "");
    const parsed = Number(intOnly);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const integerPart = raw.slice(0, decimalIndex).replace(/[^\d-]/g, "");
  const fractionalPart = raw
    .slice(decimalIndex + 1)
    .replace(/[^\d]/g, "")
    .slice(0, 2)
    .padEnd(2, "0");

  const normalized = `${integerPart || "0"}.${fractionalPart}`;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumberForDisplay(value: number): string {
  if (!Number.isFinite(value)) return "0,00";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toDateInputValue(date: Date): string {
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safe.getFullYear();
  const month = String(safe.getMonth() + 1).padStart(2, "0");
  const day = String(safe.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

