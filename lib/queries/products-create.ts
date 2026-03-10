"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { invalidateProductCreateQueries } from "@/lib/queries/invalidation";
import type { ProductMutationResponse } from "@/lib/types/products";

export type CreateProductInput = {
  code: string;
  name: string;
  customerId: number;
  unit?: string;
  price?: number;
  currency?: string;
  stockQuantity?: number;
  minStockLevel?: number;
  otherCodes?: string;
  material?: string;
  postProcess?: string;
  coating?: string;
  specs?: string;
  specsNet?: string;
  notes?: string;
};

async function createProductRequest(input: CreateProductInput) {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
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

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductRequest,
    onSuccess: async () => {
      await invalidateProductCreateQueries(queryClient);
    },
  });
}
