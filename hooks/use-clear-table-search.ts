import { useCallback } from "react";

type NavigateOptions = {
  replace?: boolean;
};

type NavigateFn<TSearch> = (
  updates: Partial<TSearch>,
  options?: NavigateOptions,
) => void;

type UseClearTableSearchOptions<
  TSearch extends { q?: string; pageIndex?: number },
> = {
  navigate: NavigateFn<TSearch>;
  cancelSearchDebounce: () => void;
  clearSearchDraft: () => void;
};

export function useClearTableSearch<
  TSearch extends { q?: string; pageIndex?: number },
>({
  navigate,
  cancelSearchDebounce,
  clearSearchDraft,
}: UseClearTableSearchOptions<TSearch>) {
  return useCallback(
    (updates?: Partial<TSearch>, options?: NavigateOptions) => {
      cancelSearchDebounce();
      clearSearchDraft();
      const nextUpdates = { ...(updates ?? {}) } as Partial<TSearch>;
      (nextUpdates as { q?: string }).q = undefined;
      (nextUpdates as { pageIndex?: number }).pageIndex = 0;

      navigate(nextUpdates, options);
    },
    [cancelSearchDebounce, clearSearchDraft, navigate],
  );
}
