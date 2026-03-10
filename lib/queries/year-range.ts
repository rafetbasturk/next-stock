import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import type { YearRangeResult } from "@/lib/queries/orders";
import { getClientTimeZone } from "@/lib/timezone-client";

export const yearRangeQueryKeys = {
  all: ["orders", "year-range"] as const,
  byTimeZone: (timeZone: string) => [...yearRangeQueryKeys.all, { timeZone }] as const,
};

async function fetchYearRange(): Promise<YearRangeResult> {
  const response = await fetch("/api/orders/year-range", {
    method: "GET",
    headers: {
      "x-timezone": getClientTimeZone(),
    },
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<YearRangeResult>;
  try {
    payload = (await response.json()) as ApiResponse<YearRangeResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const yearRangeQueryOptions = (timeZone: string) =>
  queryOptions({
    queryKey: yearRangeQueryKeys.byTimeZone(timeZone),
    queryFn: fetchYearRange,
    staleTime: QUERY_STALE_TIMES.lookup,
  });

export const yearRangeQuery = yearRangeQueryOptions;

export function useYearRange() {
  return useQuery(yearRangeQueryOptions(getClientTimeZone()));
}
