"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildMaterialPlanningHref } from "@/lib/material-planning-search";
import type { MaterialPlanningSearch } from "@/lib/types/search";

type NavigateOptions = {
  replace?: boolean;
};

export function useOrdersMaterialPlanningSearchNavigation(
  search: MaterialPlanningSearch,
) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (updates: Partial<MaterialPlanningSearch>, options?: NavigateOptions) => {
      const href = buildMaterialPlanningHref(search, updates);

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
