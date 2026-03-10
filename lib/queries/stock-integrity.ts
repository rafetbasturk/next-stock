"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { invalidateStockIntegrityQueries } from "@/lib/queries/invalidation";
import { QUERY_STALE_TIMES } from "@/lib/queries/query-defaults";
import type {
  ReconcileStockIntegrityResult,
} from "@/lib/server/stock-integrity";
import type { StockIntegrityMismatch } from "@/lib/stock-integrity";

export const stockIntegrityQueryKeys = {
  all: ["stock", "integrity"] as const,
  report: () => [...stockIntegrityQueryKeys.all, "report"] as const,
};

async function fetchStockIntegrityReport(): Promise<Array<StockIntegrityMismatch>> {
  const response = await fetch("/api/stock/integrity", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiResponse<Array<StockIntegrityMismatch>>;
  try {
    payload = (await response.json()) as ApiResponse<Array<StockIntegrityMismatch>>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function reconcileStockIntegrityRequest(): Promise<ReconcileStockIntegrityResult> {
  const response = await fetch("/api/stock/integrity/reconcile", {
    method: "POST",
    credentials: "include",
  });

  let payload: ApiResponse<ReconcileStockIntegrityResult>;
  try {
    payload = (await response.json()) as ApiResponse<ReconcileStockIntegrityResult>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export const stockIntegrityReportQueryOptions = queryOptions({
  queryKey: stockIntegrityQueryKeys.report(),
  queryFn: fetchStockIntegrityReport,
  staleTime: QUERY_STALE_TIMES.detail,
});

export const stockIntegrityReportQuery = stockIntegrityReportQueryOptions;

export function useStockIntegrityReport(enabled: boolean = true) {
  return useQuery({
    ...stockIntegrityReportQueryOptions,
    enabled,
  });
}

export function useReconcileStockIntegrityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reconcileStockIntegrityRequest,
    onSuccess: async () => {
      await invalidateStockIntegrityQueries(queryClient);
    },
  });
}
