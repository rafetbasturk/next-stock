"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import {
  invalidateProductRemoveQueries,
  invalidateProductStockAdjustmentQueries,
  invalidateProductUpdateQueries,
} from "@/lib/queries/invalidation";
import type {
  MutationResponse,
  MutationResponseWithId,
} from "@/lib/types/api";
import type { ProductMutationResponse } from "@/lib/types/products";

export type ProductStockActionInput = {
  type: "IN" | "OUT";
  quantity: number;
  notes?: string;
};

export type UpdateProductPayload = {
  code: string;
  name: string;
  customerId: number;
  unit: string;
  price: number;
  currency: string;
  minStockLevel: number;
  material?: string;
  coating?: string;
  postProcess?: string;
  specs?: string;
  specsNet?: string;
  notes?: string;
  stockAction?: ProductStockActionInput;
};

type UpdateProductInput = {
  id: number;
  data: UpdateProductPayload;
};

type RemoveProductInput = {
  id: number;
};

type AdjustProductStockInput = {
  id: number;
  data: {
    quantity: number;
    notes?: string;
    actionType?: "IN" | "OUT" | "TRANSFER";
    targetProductId?: number;
  };
};

async function updateProductRequest(input: UpdateProductInput) {
  const response = await fetch(`/api/products/${input.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input.data),
  });

  let payload: ApiResponse<ProductMutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<ProductMutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function removeProductRequest(input: RemoveProductInput) {
  const response = await fetch(`/api/products/${input.id}`, {
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

async function adjustProductStockRequest(input: AdjustProductStockInput) {
  const response = await fetch(`/api/products/${input.id}/stock-adjustment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input.data),
  });

  let payload: ApiResponse<MutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<MutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProductRequest,
    onSuccess: async (_, variables) => {
      const stockAction = variables.data.stockAction;

      if (stockAction?.type === "IN" && stockAction.quantity > 0) {
        await invalidateProductStockAdjustmentQueries(queryClient, variables.id);
        return;
      }

      await invalidateProductUpdateQueries(queryClient, variables.id);
    },
  });
}

export function useRemoveProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeProductRequest,
    onSuccess: async (_, variables) => {
      await invalidateProductRemoveQueries(queryClient, variables.id);
    },
  });
}

export function useAdjustProductStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adjustProductStockRequest,
    onSuccess: async (_, variables) => {
      await invalidateProductStockAdjustmentQueries(queryClient, variables.id);
    },
  });
}
