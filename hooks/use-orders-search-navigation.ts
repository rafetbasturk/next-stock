"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildOrdersHref } from "@/lib/orders-search";
import type { OrdersSearch } from "@/lib/types/search";

type NavigateOptions = {
  replace?: boolean;
};

export function useOrdersSearchNavigation(search: OrdersSearch) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (updates: Partial<OrdersSearch>, options?: NavigateOptions) => {
      const href = buildOrdersHref(search, updates);

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
