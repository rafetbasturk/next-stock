"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildProductsHref } from "@/lib/products-search";
import type { ProductsSearch } from "@/lib/types/search";

type NavigateOptions = {
  replace?: boolean;
};

export function useProductsSearchNavigation(search: ProductsSearch) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (updates: Partial<ProductsSearch>, options?: NavigateOptions) => {
      const href = buildProductsHref(search, updates);

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
