"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildCustomersHref } from "@/lib/customers-search";
import type { CustomersSearch } from "@/lib/types/search";

type NavigateOptions = {
  replace?: boolean;
};

export function useCustomersSearchNavigation(search: CustomersSearch) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (updates: Partial<CustomersSearch>, options?: NavigateOptions) => {
      const href = buildCustomersHref(search, updates);

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
