import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { Rate } from "@/lib/currency";
import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import { getClientTimeZone } from "@/lib/timezone-client";
import type {
  Currency,
  KeyMetricsResult,
  MetricsFilters,
  MonthlyOverviewPoint,
} from "@/lib/types/metrics";
import { useExchangeRatesStore } from "@/stores/exchange-rates-store";

export const metricsQueryKeys = {
  all: ["metrics"] as const,

  keyMetrics: (
    filters: MetricsFilters,
    preferredCurrency: Currency,
    ratesVersion: string | null,
    timeZone: string,
  ) =>
    [
      ...metricsQueryKeys.all,
      "keyMetrics",
      {
        customerId: filters.customerId ?? null,
        year: filters.year ?? null,
        currency: preferredCurrency,
        ratesVersion,
        timeZone,
      },
    ] as const,

  monthlyOverview: (
    filters: MetricsFilters,
    preferredCurrency: Currency,
    ratesVersion: string | null,
    monthCount: number,
    timeZone: string,
  ) =>
    [
      ...metricsQueryKeys.all,
      "monthlyOverview",
      {
        customerId: filters.customerId ?? null,
        year: filters.year ?? null,
        monthCount,
        currency: preferredCurrency,
        ratesVersion,
        timeZone,
      },
    ] as const,
};

async function postJson<TResponse>(
  url: string,
  body: unknown,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-timezone": getClientTimeZone(),
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
  });

  let payload: ApiResponse<TResponse>;
  try {
    payload = (await response.json()) as ApiResponse<TResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const useFetchMetrics = (
  filters: MetricsFilters,
  rates: Array<Rate>,
  preferredCurrency: Currency,
) => {
  const hasHydrated = useExchangeRatesStore((state) => state.hasHydrated);
  const ratesVersion = useExchangeRatesStore((state) => state.ratesVersion);
  const isReady = Boolean(preferredCurrency) && ratesVersion !== null && rates.length > 0;
  const timeZone = getClientTimeZone();

  const keyMetricsOptions = keyMetricsQueryOptions(
    filters,
    rates,
    preferredCurrency,
    ratesVersion,
    timeZone,
  );

  return useQuery({
    ...keyMetricsOptions,
    enabled: hasHydrated && isReady,
  });
};

export const keyMetricsQueryOptions = (
  filters: MetricsFilters,
  rates: Array<Rate>,
  preferredCurrency: Currency,
  ratesVersion: string | null,
  timeZone: string,
) =>
  queryOptions({
    // ratesVersion is the semantic cache identity for the current rate snapshot.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: metricsQueryKeys.keyMetrics(
      filters,
      preferredCurrency,
      ratesVersion,
      timeZone,
    ),
    queryFn: () =>
      postJson<KeyMetricsResult>("/api/metrics", {
        rates,
        filters: {
          customerId: filters.customerId,
          year: filters.year,
        },
        preferredCurrency,
      }),
    staleTime: QUERY_STALE_TIMES.detail,
    placeholderData: keepPreviousData,
  });

export const useFetchMonthlyOverview = (
  filters: MetricsFilters,
  rates: Array<Rate>,
  preferredCurrency: Currency,
  monthCount: number = 12,
) => {
  const hasHydrated = useExchangeRatesStore((state) => state.hasHydrated);
  const ratesVersion = useExchangeRatesStore((state) => state.ratesVersion);
  const isReady = Boolean(preferredCurrency) && ratesVersion !== null && rates.length > 0;
  const timeZone = getClientTimeZone();

  const monthlyOverviewOptions = monthlyOverviewQueryOptions(
    filters,
    rates,
    preferredCurrency,
    ratesVersion,
    monthCount,
    timeZone,
  );

  return useQuery({
    ...monthlyOverviewOptions,
    enabled: hasHydrated && isReady,
  });
};

export const monthlyOverviewQueryOptions = (
  filters: MetricsFilters,
  rates: Array<Rate>,
  preferredCurrency: Currency,
  ratesVersion: string | null,
  monthCount: number,
  timeZone: string,
) =>
  queryOptions({
    // ratesVersion is the semantic cache identity for the current rate snapshot.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: metricsQueryKeys.monthlyOverview(
      filters,
      preferredCurrency,
      ratesVersion,
      monthCount,
      timeZone,
    ),
    queryFn: () =>
      postJson<Array<MonthlyOverviewPoint>>("/api/metrics/monthly-overview", {
        rates,
        filters: {
          customerId: filters.customerId,
          year: filters.year,
        },
        monthCount,
        preferredCurrency,
      }),
    staleTime: QUERY_STALE_TIMES.detail,
    placeholderData: keepPreviousData,
  });
