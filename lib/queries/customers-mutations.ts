"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/errors/api-response";
import { toClientError } from "@/lib/errors/client-error";
import { invalidateCustomerQueries } from "@/lib/queries/invalidation";
import type { MutationResponse } from "@/lib/types/api";
import type { CustomerMutationResponse } from "@/lib/types/customers";

export type CustomerMutationPayload = {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

type UpdateCustomerInput = {
  id: number;
  data: CustomerMutationPayload;
};

type RemoveCustomerInput = {
  id: number;
};

async function createCustomerRequest(input: CustomerMutationPayload) {
  const response = await fetch("/api/customers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  let payload: ApiResponse<CustomerMutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<CustomerMutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function updateCustomerRequest(input: UpdateCustomerInput) {
  const response = await fetch(`/api/customers/${input.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input.data),
  });

  let payload: ApiResponse<CustomerMutationResponse>;
  try {
    payload = (await response.json()) as ApiResponse<CustomerMutationResponse>;
  } catch (error) {
    throw toClientError(error);
  }

  if (!response.ok || !payload.ok) {
    throw toClientError(payload);
  }

  return payload.data;
}

async function removeCustomerRequest(input: RemoveCustomerInput) {
  const response = await fetch(`/api/customers/${input.id}`, {
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

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomerRequest,
    onSuccess: async () => {
      await invalidateCustomerQueries(queryClient);
    },
  });
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomerRequest,
    onSuccess: async () => {
      await invalidateCustomerQueries(queryClient);
    },
  });
}

export function useRemoveCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeCustomerRequest,
    onSuccess: async () => {
      await invalidateCustomerQueries(queryClient);
    },
  });
}
