import type { DefaultOptions } from "@tanstack/react-query";

export const QUERY_STALE_TIMES = {
  list: 60_000,
  detail: 60_000,
  lookup: 5 * 60_000,
} as const;

export const QUERY_GC_TIME = 5 * 60_000;

export const QUERY_CLIENT_DEFAULT_OPTIONS = {
  queries: {
    staleTime: QUERY_STALE_TIMES.detail,
    gcTime: QUERY_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
} satisfies DefaultOptions;
