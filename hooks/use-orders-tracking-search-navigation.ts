"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildOrderTrackingHref } from "@/lib/orders-tracking-search";
import type { OrderTrackingSearch } from "@/lib/types/search";

type NavigateOptions = {
  replace?: boolean;
};

export function useOrdersTrackingSearchNavigation(search: OrderTrackingSearch) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (updates: Partial<OrderTrackingSearch>, options?: NavigateOptions) => {
      const href = buildOrderTrackingHref(search, updates);

      startTransition(() => {
        if (options?.replace) {
          router.replace(href, { scroll: false });
          return;
        }

        router.push(href, { scroll: false });
      });
    },
    [router, search, startTransition],
  );
}
