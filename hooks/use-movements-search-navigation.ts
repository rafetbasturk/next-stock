"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildMovementsHref } from "@/lib/movements-search";
import type { StockSearch } from "@/lib/types/search";

type NavigateOptions = {
  replace?: boolean;
};

export function useMovementsSearchNavigation(search: StockSearch) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (updates: Partial<StockSearch>, options?: NavigateOptions) => {
      const href = buildMovementsHref(search, updates);

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

