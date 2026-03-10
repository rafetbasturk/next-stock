// src/lib/currency.ts
import { AppError } from "@/lib/errors/app-error";
import type { Currency } from "@/lib/types/domain";

export const currencyArray = ["TRY", "EUR", "USD"] as const;

export const currencyFlags: Record<string, string> = {
  TRY: "🇹🇷",
  EUR: "🇪🇺",
  USD: "🇺🇸",
} as const;

export type Rate = {
  currency: Currency;
  targetCurrency: Currency;
  rate: number;
};

export type ExchangeRateSnapshot = {
  base: Currency;
  fetchedAt: number;
  providerDate: string | null;
  rates: Array<Rate>;
  version: string;
};

function hasRatesRecord(
  value: unknown,
): value is { rates: Record<string, unknown> } {
  if (!value || typeof value !== "object" || !("rates" in value)) {
    return false;
  }

  const candidate = value as { rates: unknown };
  return Boolean(candidate.rates && typeof candidate.rates === "object");
}

function getProviderDate(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("date" in value)) {
    return null;
  }

  const candidate = value as { date?: unknown };
  return typeof candidate.date === "string" && candidate.date.trim()
    ? candidate.date
    : null;
}

export const fallbackRates: Array<Rate> = [
  { currency: "TRY", targetCurrency: "EUR", rate: 0.02064 },
  { currency: "TRY", targetCurrency: "USD", rate: 0.02397 },
  { currency: "TRY", targetCurrency: "TRY", rate: 1 },
  { currency: "USD", targetCurrency: "EUR", rate: 0.86125 },
  { currency: "USD", targetCurrency: "TRY", rate: 41.724 },
  { currency: "USD", targetCurrency: "USD", rate: 1 },
  { currency: "EUR", targetCurrency: "TRY", rate: 48.446 },
  { currency: "EUR", targetCurrency: "USD", rate: 1.1611 },
  { currency: "EUR", targetCurrency: "EUR", rate: 1 },
];

export const EXCHANGE_RATE_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

export function shouldUpdateRates(updateTimestamp: number | null): boolean {
  return (
    !updateTimestamp ||
    Date.now() - updateTimestamp >= EXCHANGE_RATE_UPDATE_INTERVAL
  );
}

function normalizeRateSnapshot(rates: Array<Rate>): Array<Rate> {
  return [...rates].sort((left, right) => {
    if (left.currency !== right.currency) {
      return left.currency.localeCompare(right.currency);
    }

    return left.targetCurrency.localeCompare(right.targetCurrency);
  });
}

export function createRatesVersion(
  base: Currency,
  providerDate: string | null,
  rates: Array<Rate>,
): string {
  const signature = normalizeRateSnapshot(rates)
    .map((rate) => `${rate.currency}:${rate.targetCurrency}:${rate.rate}`)
    .join("|");

  return `${base}:${providerDate ?? "unknown"}:${signature}`;
}

// Helper function to filter and transform rates from storage
export const transformRates = (
  rates: Array<Rate>,
  currency: string,
): Record<string, number> => {
  return rates
    .filter((rate) => rate.currency === currency)
    .reduce(
      (acc, rate) => {
        acc[rate.targetCurrency] = rate.rate;
        return acc;
      },
      {} as Record<string, number>,
    );
};

// Fetch all rates for a single base currency in one API call
export async function fetchRatesForCurrency(
  base: Currency,
): Promise<ExchangeRateSnapshot> {
  const url = new URL("https://api.frankfurter.dev/v1/latest");
  url.searchParams.set("base", base);

  // Ask the API only for the currencies you support (smaller payload, faster)
  const symbols = currencyArray.filter((c) => c !== base).join(",");
  if (symbols) url.searchParams.set("symbols", symbols);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // Optional: avoid stale cached responses in some environments
      cache: "no-store",
    });

    // Try to parse JSON even on errors (but safely)
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // keep data = null; handled below
    }

    if (!response.ok) {
      throw new AppError(
        "CURRENCY_RATE_FETCH_FAILED",
        "Could not fetch currency rates from provider.",
      );
    }

    if (!hasRatesRecord(data)) {
      throw new AppError(
        "CURRENCY_RATE_INVALID_RESPONSE",
        "Currency provider returned invalid response data.",
      );
    }

    const rates: Array<Rate> = Object.entries(data.rates)
      .map(([target, rate]) => ({
        currency: base,
        targetCurrency: target as Currency,
        rate: Number(rate),
      }))
      .filter((r) => Number.isFinite(r.rate));

    // Always include self-reference rate = 1
    rates.push({ currency: base, targetCurrency: base, rate: 1 });

    const normalizedRates = normalizeRateSnapshot(rates);
    const providerDate = getProviderDate(data);

    return {
      base,
      fetchedAt: Date.now(),
      providerDate,
      rates: normalizedRates,
      version: createRatesVersion(base, providerDate, normalizedRates),
    };
  } catch (err) {
    // If fetch was aborted (timeout), surface a meaningful error
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AppError(
        "CURRENCY_RATE_INVALID_RESPONSE",
        "Currency provider request timed out.",
        { cause: err },
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function createCurrencyCombinations(
  currencies: Array<string>,
): Array<Array<string>> {
  const combinations: Array<Array<string>> = [];

  for (const from of currencies) {
    for (const to of currencies) {
      combinations.push([from, to]);
    }
  }

  return combinations;
}

export const currencyCombinations = createCurrencyCombinations([
  ...currencyArray,
]);

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Array<Rate>,
) {
  // If same currency, return original amount
  if (fromCurrency === toCurrency) {
    return parseFloat(amount.toFixed(2));
  }

  // Find the conversion rate
  const rateObj = rates.find(
    (rate) =>
      rate.currency === fromCurrency && rate.targetCurrency === toCurrency,
  );

  if (rateObj) {
    return Math.round(parseFloat((amount * rateObj.rate).toFixed(2)));
  }

  // If direct rate not found, try to find reverse rate
  const reverseRateObj = rates.find(
    (rate) =>
      rate.currency === toCurrency && rate.targetCurrency === fromCurrency,
  );

  if (reverseRateObj) {
    return Math.round(parseFloat((amount / reverseRateObj.rate).toFixed(2)));
  }

  // If neither direct nor reverse rate found, try conversion through USD
  const toUSDRate = rates.find(
    (rate) => rate.currency === fromCurrency && rate.targetCurrency === "USD",
  );
  const fromUSDRate = rates.find(
    (rate) => rate.currency === "USD" && rate.targetCurrency === toCurrency,
  );

  if (toUSDRate && fromUSDRate) {
    const usdAmount = amount * toUSDRate.rate;
    return Math.round(parseFloat((usdAmount * fromUSDRate.rate).toFixed(2)));
  }

  throw new AppError(
    "CURRENCY_RATE_NOT_FOUND",
    `No conversion rate path found for ${fromCurrency} to ${toCurrency}.`,
  );
}

export const convertToCurrencyFormat = ({
  cents,
  currency = "TRY",
  locale = "tr-TR",
  style = "currency",
  compact = false,
}: {
  cents: number;
  currency?: Currency;
  locale?: Intl.LocalesArgument;
  style?: Intl.NumberFormatOptionsStyle;
  compact?: boolean;
}) => {
  const amount = cents / 100;

  return new Intl.NumberFormat(locale, {
    style,
    currency,
    currencyDisplay: "symbol",
    ...(compact && { notation: "compact" }),
  }).format(amount);
};

/**
 * Convert amount between currencies using available rates.
 * Supports direct, reverse, and indirect (bridge) conversions.
 */

// Backend uses this
export function convertToBaseCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Array<Rate>,
): number {
  if (from === to) return amount;

  // Direct conversion (EUR → USD)
  const direct = rates.find(
    (r) => r.currency === from && r.targetCurrency === to,
  );
  if (direct) return amount * direct.rate;

  // Reverse conversion (USD → EUR via EUR→USD)
  const reverse = rates.find(
    (r) => r.currency === to && r.targetCurrency === from,
  );
  if (reverse) return amount / reverse.rate;

  // Indirect conversions via common bridge currencies
  const bridgeCurrencies: Array<Currency> = ["TRY", "USD", "EUR"];
  for (const bridge of bridgeCurrencies) {
    if (bridge === from || bridge === to) continue;

    const toBridge = rates.find(
      (r) => r.currency === from && r.targetCurrency === bridge,
    );
    const bridgeToTarget = rates.find(
      (r) => r.currency === bridge && r.targetCurrency === to,
    );

    if (toBridge && bridgeToTarget) {
      return amount * toBridge.rate * bridgeToTarget.rate;
    }
  }

  throw new AppError(
    "CURRENCY_RATE_NOT_FOUND",
    `No conversion path found for ${from} to ${to}.`,
  );
}

/**
 * Format price in cents to a localized currency string
 * @param priceInCents - Price stored in cents (e.g., 10000 = 100.00)
 * @param currency - Currency code (TRY, EUR, USD, etc.)
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted currency string (e.g., "₺100,00")
 */
export function formatPrice(
  priceInCents: number,
  currency: Currency = "TRY",
  locale: string = "tr-TR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(priceInCents / 100);
}
