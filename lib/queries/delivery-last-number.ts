"use client";

import type { DeliveryKind } from "@/lib/types/domain";
import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";

type LastDeliveryNumberPayload = {
  deliveryNumber: string | null;
};

export const deliveryLastNumberQueryKeys = {
  all: ["deliveries", "last-number"] as const,
  byKind: (kind: DeliveryKind) =>
    [...deliveryLastNumberQueryKeys.all, kind] as const,
};

async function fetchLastDeliveryNumber(kind: DeliveryKind): Promise<string | null> {
  const response = await fetch(`/api/deliveries/last-number?kind=${kind}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<LastDeliveryNumberPayload>;
  try {
    payload = (await response.json()) as ApiResponse<LastDeliveryNumberPayload>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data.deliveryNumber ?? null;
}

export const deliveryLastNumberQueryOptions = (kind: DeliveryKind) =>
  queryOptions({
    queryKey: deliveryLastNumberQueryKeys.byKind(kind),
    queryFn: () => fetchLastDeliveryNumber(kind),
    staleTime: QUERY_STALE_TIMES.detail,
  });

export const deliveryLastNumberQuery = deliveryLastNumberQueryOptions;

export function useDeliveryLastNumber(kind: DeliveryKind, enabled = true) {
  return useQuery({
    ...deliveryLastNumberQueryOptions(kind),
    enabled,
  });
}

export function getNextDeliveryNumber(
  lastDeliveryNumber: string | null,
  kind: DeliveryKind,
): string {
  const nowYear = new Date().getFullYear();
  const fallback = kind === "RETURN" ? `RTN-${nowYear}-001` : `DLV-${nowYear}-001`;

  if (!lastDeliveryNumber?.trim()) {
    return fallback;
  }

  const trimmed = lastDeliveryNumber.trim();
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
