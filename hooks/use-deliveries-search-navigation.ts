"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildDeliveriesHref } from "@/lib/deliveries-search";
import type { DeliveriesSearch } from "@/lib/types/search";

type NavigateOptions = {
  replace?: boolean;
};

export function useDeliveriesSearchNavigation(search: DeliveriesSearch) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (updates: Partial<DeliveriesSearch>, options?: NavigateOptions) => {
      const href = buildDeliveriesHref(search, updates);

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
