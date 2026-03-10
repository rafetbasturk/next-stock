"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import {
  invalidateOrderCreateQueries,
  invalidateOrderRemoveQueries,
  invalidateOrderUpdateQueries,
} from "@/lib/queries/invalidation";
import type { MutationResponse } from "@/lib/types/api";
import type { OrderMutationResponse } from "@/lib/types/orders";

export type CreateOrderItemInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
  currency?: string;
};

export type CreateCustomOrderItemInput = {
  name: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  currency?: string;
  notes?: string;
};

export type UpsertOrderInput = {
  isCustomOrder: boolean;
  orderNumber: string;
  orderDate: string;
  customerId: number;
  status?: string;
  currency: string;
  deliveryAddress?: string;
  notes?: string;
  items: Array<CreateOrderItemInput>;
  customItems?: Array<CreateCustomOrderItemInput>;
};

export type CreateOrderInput = UpsertOrderInput;

export type UpdateOrderInput = {
  id: number;
  data: UpsertOrderInput;
};

export type RemoveOrderInput = {
  id: number;
};

async function createOrderRequest(input: CreateOrderInput) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  let payload: ApiResponse<OrderMutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<OrderMutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function updateOrderRequest(input: UpdateOrderInput) {
  const response = await fetch(`/api/orders/${input.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input.data),
  });

  let payload: ApiResponse<OrderMutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<OrderMutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function removeOrderRequest(input: RemoveOrderInput) {
  const response = await fetch(`/api/orders/${input.id}`, {
    method: "DELETE",
    credentials: "include",
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

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrderRequest,
    onSuccess: async () => {
      await invalidateOrderCreateQueries(queryClient);
    },
  });
}

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderRequest,
    onSuccess: async (_data, variables) => {
      await invalidateOrderUpdateQueries(queryClient, variables.id);
    },
  });
}

export function useRemoveOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeOrderRequest,
    onSuccess: async (_data, variables) => {
      await invalidateOrderRemoveQueries(queryClient, variables.id);
    },
  });
}
