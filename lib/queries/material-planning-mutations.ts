"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { invalidateMaterialPlanningMutationQueries } from "@/lib/queries/invalidation";
import type { MaterialPlanningMutationResponse } from "@/lib/types/orders";

type MarkMaterialPlanningCompletedInput = {
  productId: number;
};

type UndoMaterialPlanningCompletedInput = {
  orderItemId: number;
};

async function markMaterialPlanningCompletedRequest(
  input: MarkMaterialPlanningCompletedInput,
) {
  const response = await fetch("/api/orders/material-planning/plan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  let payload: ApiResponse<MaterialPlanningMutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<MaterialPlanningMutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function undoMaterialPlanningCompletedRequest(
  input: UndoMaterialPlanningCompletedInput,
) {
  const response = await fetch("/api/orders/material-planning/unplan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  let payload: ApiResponse<MaterialPlanningMutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<MaterialPlanningMutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export function useMarkMaterialPlanningCompletedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markMaterialPlanningCompletedRequest,
    onSuccess: async (data) => {
      await invalidateMaterialPlanningMutationQueries(queryClient, data.orderIds);
    },
  });
}

export function useUndoMaterialPlanningCompletedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoMaterialPlanningCompletedRequest,
    onSuccess: async (data) => {
      await invalidateMaterialPlanningMutationQueries(queryClient, data.orderIds);
    },
  });
}
