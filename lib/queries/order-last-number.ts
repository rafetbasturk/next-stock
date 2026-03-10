import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

type LastOrderNumberPayload = {
  orderNumber: string | null;
};

export const orderLastNumberQueryKeys = {
  all: ["orders", "last-number"] as const,
};

async function fetchLastOrderNumber(): Promise<string | null> {
  const response = await fetch("/api/orders/last-number", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<LastOrderNumberPayload>;
  try {
    payload = (await response.json()) as ApiResponse<LastOrderNumberPayload>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data.orderNumber ?? null;
}

export const orderLastNumberQueryOptions = queryOptions({
  queryKey: orderLastNumberQueryKeys.all,
  queryFn: fetchLastOrderNumber,
  staleTime: QUERY_STALE_TIMES.detail,
});

export const orderLastNumberQuery = orderLastNumberQueryOptions;

export function useOrderLastNumber(enabled = true) {
  return useQuery({
    ...orderLastNumberQueryOptions,
    enabled,
  });
}

export function getNextOrderNumber(lastOrderNumber: string | null): string {
  const nowYear = new Date().getFullYear();
  const fallback = `ORD-${nowYear}-001`;

  if (!lastOrderNumber?.trim()) {
    return fallback;
  }

  const trimmed = lastOrderNumber.trim();
  const match = trimmed.match(/(\d+)(?!.*\d)/);
  if (!match || match.index == null) {
    return `${trimmed}-1`;
  }

  const digits = match[1];
  const incremented = String(Number(digits) + 1).padStart(digits.length, "0");

  return (
    trimmed.slice(0, match.index) +
    incremented +
    trimmed.slice(match.index + digits.length)
  );
}
