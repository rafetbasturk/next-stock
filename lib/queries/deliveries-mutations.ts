"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import {
  invalidateDeliveryCreateQueries,
  invalidateDeliveryRemoveQueries,
  invalidateDeliveryUpdateQueries,
} from "@/lib/queries/invalidation";
import type { MutationResponse } from "@/lib/types/api";
import type { DeliveryDetail } from "@/lib/types/deliveries";
import type { DeliveryKind } from "@/lib/types/domain";

export type DeliveryMutationItemInput = {
  orderItemId?: number;
  customOrderItemId?: number;
  deliveredQuantity: number;
};

export type DeliveryMutationPayload = {
  customerId: number;
  deliveryNumber: string;
  deliveryDate: string;
  kind: DeliveryKind;
  notes?: string;
  items: Array<DeliveryMutationItemInput>;
};

type UpdateDeliveryInput = {
  id: number;
  data: DeliveryMutationPayload;
};

type RemoveDeliveryInput = {
  id: number;
};

async function createDeliveryRequest(input: DeliveryMutationPayload) {
  const response = await fetch("/api/deliveries", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  let payload: ApiResponse<DeliveryDetail | null>;
  try {
    payload = (await response.json()) as ApiResponse<DeliveryDetail | null>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function updateDeliveryRequest(input: UpdateDeliveryInput) {
  const response = await fetch(`/api/deliveries/${input.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input.data),
  });

  let payload: ApiResponse<DeliveryDetail | null>;
  try {
    payload = (await response.json()) as ApiResponse<DeliveryDetail | null>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function removeDeliveryRequest(input: RemoveDeliveryInput) {
  const response = await fetch(`/api/deliveries/${input.id}`, {
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

export function useCreateDeliveryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeliveryRequest,
    onSuccess: async (data) => {
      await invalidateDeliveryCreateQueries(queryClient, data);
    },
  });
}

export function useUpdateDeliveryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDeliveryRequest,
    onSuccess: async (data, variables) => {
      await invalidateDeliveryUpdateQueries(queryClient, data, variables.id);
    },
  });
}

export function useRemoveDeliveryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeDeliveryRequest,
    onSuccess: async (_data, variables) => {
      await invalidateDeliveryRemoveQueries(queryClient, variables.id);
    },
  });
}
