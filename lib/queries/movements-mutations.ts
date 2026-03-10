"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { invalidateMovementQueries } from "@/lib/queries/invalidation";
import type { MutationResponseWithId } from "@/lib/types/api";

type UpdateMovementInput = {
  id: number;
  data: {
    quantity: number;
    notes?: string;
    movementType?: "IN" | "OUT" | "ADJUSTMENT";
  };
};

type RemoveMovementInput = {
  id: number;
};

async function updateMovementRequest(input: UpdateMovementInput) {
  const response = await fetch(`/api/movements/${input.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input.data),
  });

  let payload: ApiResponse<MutationResponseWithId>;
  try {
    payload = (await response.json()) as ApiResponse<MutationResponseWithId>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function removeMovementRequest(input: RemoveMovementInput) {
  const response = await fetch(`/api/movements/${input.id}`, {
    method: "DELETE",
    credentials: "include",
  });

  let payload: ApiResponse<MutationResponseWithId>;
  try {
    payload = (await response.json()) as ApiResponse<MutationResponseWithId>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export function useUpdateMovementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMovementRequest,
    onSuccess: async () => {
      await invalidateMovementQueries(queryClient);
    },
  });
}

export function useRemoveMovementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeMovementRequest,
    onSuccess: async () => {
      await invalidateMovementQueries(queryClient);
    },
  });
}
